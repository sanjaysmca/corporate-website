-- ═══════════════════════════════════════════════════════════════════════════
--  Migration:  003_security_hardening.sql
--  Project:    Corporate Website + Admin Dashboard
--  Depends on: 001_initial_schema.sql  (already executed)
--  Safe after: 002_security_fixes.sql  (may or may not have been executed)
--
--  PURPOSE
--  ───────
--  001 created every write policy as TO authenticated WITH CHECK (TRUE).
--  "authenticated" in Supabase means "any user with a valid JWT" — not
--  "admin". This migration replaces every such policy so that all mutating
--  operations require the caller to have a row in public.profiles with
--  role = 'admin'.
--
--  WHAT IS CHANGED
--  ───────────────
--  A. public.is_admin() helper           — created (idempotent; safe if 002 ran)
--  B. SECURITY DEFINER search_path       — fixed on get_dashboard_stats()
--  C. set_updated_at() search_path       — added for defence-in-depth
--  D. profiles UPDATE policy             — prevents role column self-promotion
--  E. services  4 write policies         — tightened to is_admin()
--  F. projects  4 write policies         — tightened to is_admin()
--  G. enquiries 3 admin policies         — tightened to is_admin()
--  H. media     3 existing + 1 new       — tightened/added with is_admin()
--  I. storage   3 write policies         — idempotent drop+recreate with is_admin()
--  J. get_dashboard_stats() body         — explicit is_admin() guard + search_path
--
--  WHAT IS NOT CHANGED
--  ───────────────────
--  • No tables, columns, indexes, or triggers are modified.
--  • No existing data is deleted or altered.
--  • Public read policies are preserved exactly as-is.
--  • The anon contact-form INSERT on enquiries is preserved exactly as-is.
--
--  HOW TO RUN
--  ──────────
--  Supabase Dashboard → SQL Editor → New Query → paste → Run
--  Run AFTER 001. Run BEFORE or INSTEAD OF 002 (this supersedes 002).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
--  A.  is_admin() helper function
--      ────────────────────────────────────────────────────────────────────
--  Checks whether the current caller (auth.uid()) has a row in
--  public.profiles with role = 'admin'.
--
--  Design notes:
--    SECURITY INVOKER  — runs as the calling user so RLS on profiles is
--                        respected. Admins can read their own profile row
--                        (existing SELECT policy), so the lookup works.
--    STABLE            — PostgreSQL can cache the result within a single
--                        statement, avoiding repeated profile lookups when
--                        multiple policies fire in one query.
--    SET search_path   — prevents search-path injection even though this
--                        function is INVOKER (defence in depth).
--    CREATE OR REPLACE — safe whether or not migration 002 has been run.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.profiles
    WHERE  id   = auth.uid()
    AND    role = 'admin'
  );
$$;

-- Revoke from anon (cannot be an admin); grant to authenticated callers only.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
--  B + J.  get_dashboard_stats() — admin-only guard + safe search_path
--      ────────────────────────────────────────────────────────────────────
--  Problem in 001:
--    • SECURITY DEFINER without SET search_path is vulnerable to
--      search-path injection attacks (CWE-427). An attacker could create a
--      schema that shadows 'public' and intercept the queries inside.
--    • GRANT TO authenticated allowed any authenticated Supabase user to
--      call it and receive aggregate counts (including total enquiries).
--
--  Fix:
--    • SET search_path = public, pg_catalog — eliminates the injection risk.
--    • Explicit is_admin() guard at the top of the body — raises
--      insufficient_privilege for any caller without an admin profile row.
--    • GRANT/REVOKE unchanged from 001 — the body check is the authority.
--    • CREATE OR REPLACE — safe whether or not 002 has been executed.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Primary security gate: reject any caller who is not an admin.
  -- The GRANT TO authenticated below is a secondary scope limiter;
  -- this check is the authoritative enforcement point.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'Access denied: get_dashboard_stats() requires admin role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- SECURITY DEFINER lets these sub-queries bypass RLS so they count
  -- ALL rows (including inactive ones) — which is what an admin dashboard needs.
  RETURN json_build_object(
    'total_projects',    (SELECT COUNT(*)  FROM public.projects),
    'active_projects',   (SELECT COUNT(*)  FROM public.projects  WHERE is_active   = TRUE),
    'featured_projects', (SELECT COUNT(*)  FROM public.projects  WHERE is_featured  = TRUE),
    'total_services',    (SELECT COUNT(*)  FROM public.services),
    'active_services',   (SELECT COUNT(*)  FROM public.services  WHERE is_active   = TRUE),
    'total_enquiries',   (SELECT COUNT(*)  FROM public.enquiries),
    'new_enquiries',     (SELECT COUNT(*)  FROM public.enquiries WHERE status      = 'new'),
    'total_media',       (SELECT COUNT(*)  FROM public.media)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
--  C.  set_updated_at() — safe search_path
--      ────────────────────────────────────────────────────────────────────
--  This trigger function is SECURITY INVOKER (default), so the search_path
--  attack surface is smaller. We set it explicitly anyway for auditability
--  and to future-proof against any accidental SECURITY DEFINER re-creation.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  D.  profiles — prevent role self-promotion
--      ────────────────────────────────────────────────────────────────────
--  Problem in 001:
--    Policy "profiles: admin can update own profile" uses:
--      WITH CHECK (auth.uid() = id)
--    This only verifies the user is updating their OWN row. It does not
--    prevent them from changing the value of the 'role' column.
--
--    Today the table CHECK constraint only permits role = 'admin', so the
--    practical risk is low. However:
--      (a) If additional roles are ever added, the policy becomes a
--          privilege-escalation path.
--      (b) Explicitly blocking role changes is a defence-in-depth
--          requirement (Requirement 7).
--
--  Fix:
--    Add a WITH CHECK sub-clause that compares the NEW row's role value
--    against the CURRENT value stored in the database. If they differ, the
--    update is rejected with a policy violation — no trigger needed.
--
--    The sub-query reads through the existing SELECT RLS policy (which
--    already allows an admin to read their own row), so there is no
--    privilege escalation in the sub-query itself.
--
--  UNCHANGED: "profiles: admin can read own profile" — not touched.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles: admin can update own profile" ON public.profiles;

CREATE POLICY "profiles: admin can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)                           -- can only target own row
  WITH CHECK (
    auth.uid() = id                                 -- new row still belongs to same user
    AND role = (                                    -- role column must not change
      SELECT p.role
      FROM   public.profiles p
      WHERE  p.id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
--  E.  services — restrict writes to admins
--      ────────────────────────────────────────────────────────────────────
--  Policies from 001 that are replaced (exact names from 001):
--    "services: admin full read"   — TO authenticated / USING (TRUE)
--    "services: admin can insert"  — TO authenticated / WITH CHECK (TRUE)
--    "services: admin can update"  — TO authenticated / TRUE / TRUE
--    "services: admin can delete"  — TO authenticated / USING (TRUE)
--
--  The public read policy is NOT touched:
--    "services: public can read active" remains in place, allowing anon
--    users to read is_active = TRUE rows.
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the four overly-permissive policies from 001
DROP POLICY IF EXISTS "services: admin full read"  ON public.services;
DROP POLICY IF EXISTS "services: admin can insert" ON public.services;
DROP POLICY IF EXISTS "services: admin can update" ON public.services;
DROP POLICY IF EXISTS "services: admin can delete" ON public.services;

-- Admin SELECT: full read including inactive/draft records
CREATE POLICY "services: admin full read"
  ON public.services FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admin INSERT: only admins may add services
CREATE POLICY "services: admin can insert"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admin UPDATE: only admins may edit services
CREATE POLICY "services: admin can update"
  ON public.services FOR UPDATE
  TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin DELETE: only admins may delete services
CREATE POLICY "services: admin can delete"
  ON public.services FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  F.  projects — restrict writes to admins
--      ────────────────────────────────────────────────────────────────────
--  Policies from 001 that are replaced (exact names):
--    "projects: admin full read"
--    "projects: admin can insert"
--    "projects: admin can update"
--    "projects: admin can delete"
--
--  UNCHANGED: "projects: public can read active" (anon, is_active = TRUE)
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "projects: admin full read"  ON public.projects;
DROP POLICY IF EXISTS "projects: admin can insert" ON public.projects;
DROP POLICY IF EXISTS "projects: admin can update" ON public.projects;
DROP POLICY IF EXISTS "projects: admin can delete" ON public.projects;

CREATE POLICY "projects: admin full read"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "projects: admin can insert"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "projects: admin can update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "projects: admin can delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  G.  enquiries — only admins may read or manage submissions
--      ────────────────────────────────────────────────────────────────────
--  Policies from 001 that are replaced (exact names):
--    "enquiries: admin full read"   — TO authenticated / USING (TRUE)
--    "enquiries: admin can update"  — TO authenticated / TRUE / TRUE
--    "enquiries: admin can delete"  — TO authenticated / USING (TRUE)
--
--  UNCHANGED: "enquiries: public can insert"
--    Public visitors still submit contact form enquiries via the anon role.
--    The existing WITH CHECK on that policy validates name, email, message.
--
--  Note: there is intentionally NO SELECT policy for anon on enquiries.
--  Enquiry data must remain private to admins only.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "enquiries: admin full read"  ON public.enquiries;
DROP POLICY IF EXISTS "enquiries: admin can update" ON public.enquiries;
DROP POLICY IF EXISTS "enquiries: admin can delete" ON public.enquiries;

-- Admin SELECT: only admins may read enquiry submissions
CREATE POLICY "enquiries: admin full read"
  ON public.enquiries FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admin UPDATE: only admins may update status or admin_notes
CREATE POLICY "enquiries: admin can update"
  ON public.enquiries FOR UPDATE
  TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin DELETE: only admins may delete spam enquiries
CREATE POLICY "enquiries: admin can delete"
  ON public.enquiries FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  H.  media — restrict writes to admins; add missing UPDATE policy
--      ────────────────────────────────────────────────────────────────────
--  Policies from 001 that are replaced (exact names):
--    "media: admin full read"   — TO authenticated / USING (TRUE)
--    "media: admin can insert"  — TO authenticated / WITH CHECK (auth.uid() = uploaded_by)
--    "media: admin can delete"  — TO authenticated / USING (auth.uid() = uploaded_by)
--
--  Gap in 001: No UPDATE policy existed, meaning UPDATE was blocked for
--  everyone (no-policy = deny in RLS). This adds an admin-only UPDATE.
--
--  UNCHANGED: "media: public can read" (anon, TRUE) — public can still
--  read media records to get image URLs for the public website.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "media: admin full read"  ON public.media;
DROP POLICY IF EXISTS "media: admin can insert" ON public.media;
DROP POLICY IF EXISTS "media: admin can update" ON public.media;   -- may exist from 002
DROP POLICY IF EXISTS "media: admin can delete" ON public.media;

-- Admin SELECT: full read of all media records
CREATE POLICY "media: admin full read"
  ON public.media FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admin INSERT: only admins may add media records; uploaded_by must match caller
CREATE POLICY "media: admin can insert"
  ON public.media FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    AND auth.uid() = uploaded_by
  );

-- Admin UPDATE: only admins may update alt_text or other metadata
-- (storage_path and public_url should not change after upload)
CREATE POLICY "media: admin can update"
  ON public.media FOR UPDATE
  TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin DELETE: only admins may delete media records
CREATE POLICY "media: admin can delete"
  ON public.media FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  I.  storage.objects — idempotent admin-only write policies
--      ────────────────────────────────────────────────────────────────────
--  State after 001 only:
--    "storage media: admin can upload"  — INSERT, authenticated, bucket_id only
--    "storage media: admin can delete"  — DELETE, authenticated, bucket_id only
--    (no UPDATE policy)
--
--  State after 002 (if executed):
--    "storage media: admin can upload"  — INSERT, authenticated, + is_admin()
--    "storage media: admin can update"  — UPDATE, authenticated, + is_admin()
--    "storage media: admin can delete"  — DELETE, authenticated, + is_admin()
--
--  Using DROP POLICY IF EXISTS + CREATE handles BOTH states safely.
--
--  UNCHANGED: "storage media: public read" (anon SELECT) — public image
--  delivery must remain accessible for the website.
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop all three write policies regardless of their current content
DROP POLICY IF EXISTS "storage media: admin can upload" ON storage.objects;
DROP POLICY IF EXISTS "storage media: admin can update" ON storage.objects;
DROP POLICY IF EXISTS "storage media: admin can delete" ON storage.objects;

-- Only admins may upload files to the media bucket
CREATE POLICY "storage media: admin can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND public.is_admin()
  );

-- Only admins may overwrite (update) existing files in the media bucket
-- (Supabase Storage maps file overwrites to UPDATE on storage.objects)
CREATE POLICY "storage media: admin can update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'media'
    AND public.is_admin()
  );

-- Only admins may delete files from the media bucket
CREATE POLICY "storage media: admin can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND public.is_admin()
  );


COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
--  VERIFICATION QUERIES
--  Run each block separately in the SQL Editor to confirm the migration
--  applied correctly. These are SELECT-only and cannot change any data.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Confirm is_admin() exists and is SECURITY INVOKER ─────────────────
-- Expected: one row — is_admin | f   (prosecdef = false → INVOKER)
/*
SELECT proname, prosecdef
FROM   pg_proc
WHERE  proname = 'is_admin'
AND    pronamespace = 'public'::regnamespace;
*/

-- ── 2. Confirm get_dashboard_stats() has SET search_path ─────────────────
-- Expected: proconfig contains 'search_path=public,pg_catalog'
/*
SELECT proname, proconfig
FROM   pg_proc
WHERE  proname = 'get_dashboard_stats'
AND    pronamespace = 'public'::regnamespace;
*/

-- ── 3. Confirm set_updated_at() has SET search_path ──────────────────────
/*
SELECT proname, proconfig
FROM   pg_proc
WHERE  proname = 'set_updated_at'
AND    pronamespace = 'public'::regnamespace;
*/

-- ── 4. Confirm all table RLS policies and their clauses ──────────────────
-- Expected: every write policy should contain 'is_admin()' in qual or with_check.
/*
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'services', 'projects', 'enquiries', 'media')
ORDER BY tablename, cmd;
*/

-- ── 5. Confirm storage object policies ───────────────────────────────────
-- Expected: INSERT/UPDATE/DELETE policies contain 'is_admin()'.
/*
SELECT policyname, cmd, roles, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'storage'
  AND  tablename  = 'objects'
ORDER BY cmd;
*/

-- ── 6. Confirm no old unrestricted policies remain ───────────────────────
-- Expected: 0 rows — no active policy should have WITH CHECK = 'true'
-- or USING = 'true' on a non-public, non-read operation.
/*
SELECT tablename, policyname, cmd, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
  AND  cmd        IN ('INSERT', 'UPDATE', 'DELETE')
  AND  (qual = 'true' OR with_check = 'true');
*/

-- ── 7. Confirm RLS is enabled on every table ─────────────────────────────
-- Expected: relrowsecurity = true for all five tables.
/*
SELECT relname, relrowsecurity, relforcerowsecurity
FROM   pg_class
WHERE  relnamespace = 'public'::regnamespace
  AND  relname IN ('profiles', 'services', 'projects', 'enquiries', 'media');
*/

-- ── 8. Spot-check: profiles UPDATE WITH CHECK includes role guard ─────────
-- Expected: with_check column contains 'role' sub-select.
/*
SELECT policyname, cmd, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
  AND  tablename  = 'profiles'
  AND  cmd        = 'UPDATE';
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- End of migration 003_security_hardening.sql
-- ═══════════════════════════════════════════════════════════════════════════
