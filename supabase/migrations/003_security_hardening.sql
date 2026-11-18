-- ═══════════════════════════════════════════════════════════════════════════
--  Migration:  003_security_hardening.sql  (rev 3 — final)
--  Project:    Corporate Website + Admin Dashboard
--  Depends on: 001_initial_schema.sql  (already executed in production)
--  Safe after: 002_security_fixes.sql  (may or may not have been executed)
--
--  PURPOSE
--  ───────
--  Migration 001 shipped with overly permissive write policies:
--    • Every authenticated Supabase user could INSERT/UPDATE/DELETE services,
--      projects, enquiries, and media — not only admins.
--    • get_dashboard_stats() was callable by any authenticated user (and by
--      any role that inherited PUBLIC, since REVOKE FROM PUBLIC was missing).
--    • No protection prevented a user from changing their own role column via
--      an UPDATE to the profiles table.
--    • is_admin() did not exist in 001; it is introduced here.
--
--  WHAT THIS MIGRATION DOES
--  ────────────────────────
--  A. public.is_admin()
--       Creates the helper, then:
--         REVOKE EXECUTE FROM PUBLIC      — strips the implicit grant created
--                                           by PostgreSQL on function creation
--         REVOKE EXECUTE FROM anon        — belt-and-suspenders explicit block
--         GRANT  EXECUTE TO authenticated — only logged-in callers may call it
--
--  B. public.get_dashboard_stats()
--       Replaces the 001 version (LANGUAGE sql, no body guard, no search_path)
--       with a LANGUAGE plpgsql version that:
--         • Sets a safe search_path (CWE-427 defence)
--         • Contains an explicit is_admin() body guard — raises
--           insufficient_privilege for any non-admin caller
--         • Applies the same REVOKE PUBLIC → REVOKE anon → GRANT authenticated
--           sequence as is_admin()
--
--  C. public.set_updated_at()
--       Adds SET search_path for auditability (no functional change).
--
--  D. public.prevent_role_change()  +  trg_prevent_role_change trigger
--       A BEFORE UPDATE trigger on public.profiles. For every row update it
--       compares OLD.role to NEW.role using IS DISTINCT FROM. If they differ
--       it raises check_violation immediately — before the row is written.
--       All other column updates (full_name, avatar_url, updated_at) pass
--       through without interference.
--
--       WHY A TRIGGER RATHER THAN AN RLS WITH CHECK SUB-QUERY
--       ───────────────────────────────────────────────────────
--       The alternative (a WITH CHECK that re-SELECTs the existing role and
--       compares) has two defects that the trigger avoids:
--
--         Defect 1 — NULL edge case
--           If the sub-query returns NULL (profile row not found, or RLS
--           blocks the read), the expression `role = NULL` evaluates to NULL,
--           not TRUE. PostgreSQL treats NULL as a policy failure and silently
--           blocks any update to full_name or avatar_url — even when no role
--           change was attempted. The trigger has direct access to OLD.role
--           and NEW.role; there is no sub-query and no NULL ambiguity.
--
--         Defect 2 — SECURITY DEFINER bypass
--           RLS policies only fire when the executing statement is subject to
--           RLS. A SECURITY DEFINER function runs with elevated privileges and
--           bypasses RLS entirely. Any such function that updates profiles
--           would skip the WITH CHECK guard. The trigger fires for EVERY update
--           path regardless of privilege level: direct SQL, RLS context,
--           SECURITY DEFINER functions, and future API surfaces.
--
--  E. profiles UPDATE policy
--       The WITH CHECK sub-query that compared the role column is removed.
--       Role protection is now exclusively the trigger's responsibility.
--       The policy retains only the row-ownership check:
--         USING     (auth.uid() = id)
--         WITH CHECK (auth.uid() = id)
--
--  F. services  — 4 write policies tightened from TRUE → is_admin()
--  G. projects  — 4 write policies tightened from TRUE → is_admin()
--  H. enquiries — 3 admin policies tightened from TRUE → is_admin()
--  I. media     — 3 existing policies replaced + 1 missing UPDATE added,
--                 all requiring is_admin()
--  J. storage.objects — 3 write policies replaced with is_admin() versions
--
--  WHAT IS NOT CHANGED
--  ───────────────────
--  • No tables, columns, indexes, or existing data are modified.
--  • Public read policies are preserved exactly as-is.
--  • "enquiries: public can insert" (anon contact form) is preserved.
--  • "media: public can read" (anon image reads) is preserved.
--  • "storage media: public read" (anon storage reads) is preserved.
--
--  IDEMPOTENCY
--  ───────────
--  Every statement uses CREATE OR REPLACE FUNCTION, DROP POLICY IF EXISTS,
--  or DROP TRIGGER IF EXISTS before re-creation. The migration is safe to
--  run more than once and safe to run whether or not 002 was executed.
--
--  HOW TO RUN
--  ──────────
--  Supabase Dashboard → SQL Editor → New Query → paste entire file → Run
--  Run this AFTER 001. Run BEFORE or INSTEAD OF 002 (this supersedes 002).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;


-- ═══════════════════════════════════════════════════════════════════════════
--  A.  public.is_admin()
--      ──────────────────
--  Returns TRUE when the authenticated caller (auth.uid()) has a row in
--  public.profiles with role = 'admin'. Returns FALSE otherwise.
--
--  SECURITY INVOKER  — executes with the calling user's privileges, so the
--                      existing "profiles: admin can read own profile" SELECT
--                      policy allows the lookup to succeed for valid admins.
--  STABLE            — PostgreSQL can cache the result within one statement,
--                      avoiding repeated profile lookups when multiple RLS
--                      policies fire in the same query.
--  SET search_path   — prevents search-path injection (CWE-427 defence even
--                      for INVOKER functions; protects against accidental
--                      promotion to SECURITY DEFINER in the future).
--  CREATE OR REPLACE — idempotent; safe if 002 already created this function.
--
--  PERMISSION MODEL
--  ─────────────────
--  PostgreSQL grants EXECUTE to PUBLIC on every new function automatically.
--  To restrict this correctly the sequence must be:
--    1. REVOKE from PUBLIC — removes the implicit default grant. Without this
--       step, revoking from anon has no meaningful effect because PUBLIC (which
--       includes anon) still carries the grant.
--    2. REVOKE from anon  — belt-and-suspenders; covers any explicit anon grant
--       that may have been added separately.
--    3. GRANT  to authenticated — only logged-in callers may invoke the function.
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

-- Step 1: strip the implicit PUBLIC grant PostgreSQL adds on function creation.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
-- Step 2: explicitly deny the anon role (belt-and-suspenders).
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
-- Step 3: grant only to authenticated (logged-in) callers.
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
--  B.  public.get_dashboard_stats()
--      ──────────────────────────────
--  Returns aggregate counts for the admin dashboard in a single round-trip.
--
--  DIFFERENCES FROM MIGRATION 001
--  ────────────────────────────────
--  001 used LANGUAGE sql with no body guard and no search_path:
--    • Any authenticated user (not only admins) could call it.
--    • SECURITY DEFINER without search_path is vulnerable to CWE-427.
--    • REVOKE FROM PUBLIC was missing — PUBLIC grant remained active.
--
--  This version:
--    • Uses LANGUAGE plpgsql so we can include an IF/RAISE body guard.
--    • SET search_path eliminates the injection risk.
--    • The is_admin() body guard is the authoritative enforcement point.
--      It raises insufficient_privilege (SQLSTATE 42501) for any caller
--      without an admin profile row — even if that caller somehow holds
--      the authenticated role.
--    • SECURITY DEFINER is kept so the sub-queries bypass RLS and can count
--      ALL rows (including inactive ones) — which is exactly what an admin
--      dashboard needs. The body guard is what makes this safe.
--
--  PERMISSION MODEL — same three-step sequence as is_admin()
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- ── Primary security gate ────────────────────────────────────────────────
  -- Reject any caller who is not an admin. This is the authoritative check;
  -- the GRANT TO authenticated below is a secondary scope limiter only.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'Access denied: get_dashboard_stats() requires admin role'
      USING ERRCODE = 'insufficient_privilege';   -- SQLSTATE 42501
  END IF;

  -- ── SECURITY DEFINER sub-queries bypass RLS intentionally ────────────────
  -- The admin needs counts of ALL rows (including inactive/draft records),
  -- not just what the public RLS policies expose.
  RETURN json_build_object(
    'total_projects',    (SELECT COUNT(*) FROM public.projects),
    'active_projects',   (SELECT COUNT(*) FROM public.projects  WHERE is_active   = TRUE),
    'featured_projects', (SELECT COUNT(*) FROM public.projects  WHERE is_featured = TRUE),
    'total_services',    (SELECT COUNT(*) FROM public.services),
    'active_services',   (SELECT COUNT(*) FROM public.services  WHERE is_active   = TRUE),
    'total_enquiries',   (SELECT COUNT(*) FROM public.enquiries),
    'new_enquiries',     (SELECT COUNT(*) FROM public.enquiries WHERE status      = 'new'),
    'total_media',       (SELECT COUNT(*) FROM public.media)
  );
END;
$$;

-- Step 1: strip the implicit PUBLIC grant.
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
-- Step 2: belt-and-suspenders anon deny.
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM anon;
-- Step 3: grant only to authenticated callers (is_admin() body guard then
--         enforces that only admin-role users receive a result).
GRANT  EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
--  C.  public.set_updated_at()
--      ──────────────────────────
--  Adds SET search_path for auditability. No functional change — the trigger
--  behaviour (NEW.updated_at = NOW()) is identical to migration 001.
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
--  D.  public.prevent_role_change()  +  trg_prevent_role_change
--      ─────────────────────────────────────────────────────────
--
--  HOW THE TRIGGER WORKS
--  ──────────────────────
--  The trigger function is called BEFORE EVERY UPDATE on public.profiles,
--  for every affected row. At that point PostgreSQL makes two special row
--  variables available:
--
--    OLD  — a record holding the column values currently stored in the
--            database (i.e. the value BEFORE the update is applied).
--    NEW  — a record holding the column values the caller is trying to write
--            (i.e. the value AFTER the update would be applied).
--
--  The function compares OLD.role and NEW.role using IS DISTINCT FROM.
--  This operator returns TRUE whenever the two values differ, including
--  cases where either value is NULL (unlike plain ≠ which returns NULL
--  when either operand is NULL).
--
--  If OLD.role IS DISTINCT FROM NEW.role evaluates to TRUE, the function
--  raises an exception with SQLSTATE 23514 (check_violation). The exception
--  aborts the UPDATE before the row is written to disk — the role change
--  never reaches the table.
--
--  If the values are identical (the caller did not touch the role column,
--  or SET role = OLD.role), the function returns NEW unchanged. The update
--  proceeds normally for all other columns (full_name, avatar_url, etc.).
--
--  WHAT CANNOT BYPASS THIS TRIGGER
--  ─────────────────────────────────
--  • Direct SQL updates by any user (anon, authenticated, service_role)
--  • Updates through Supabase PostgREST (the REST API)
--  • Updates inside SECURITY DEFINER functions (triggers fire even when
--    the calling function bypasses RLS)
--  • Future application code paths — any new surface that updates profiles
--    will be protected automatically without code changes
--
--  WHAT CAN LEGITIMATELY CHANGE A ROLE
--  ─────────────────────────────────────
--  Only a database superuser or a function owned by postgres running outside
--  the trigger context — specifically, a Supabase superuser session in the
--  SQL Editor with SET session_replication_role = replica, or by directly
--  disabling the trigger. These operations require database-level access, not
--  just an authenticated API call. This is the intended security boundary.
--
--  IDEMPOTENCY
--  ───────────
--  CREATE OR REPLACE FUNCTION replaces the function body safely.
--  DROP TRIGGER IF EXISTS prevents an error if the trigger already exists
--  (e.g. from a previous run of this migration or migration 002).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- ── Compare the stored role (OLD) to the requested role (NEW) ────────────
  --
  --  IS DISTINCT FROM is used instead of <> (not-equal) because:
  --    • <> returns NULL when either operand is NULL.
  --      NULL <> NULL → NULL (not TRUE, not FALSE).
  --      NULL IS DISTINCT FROM NULL → FALSE (they are the same: both NULL).
  --    • Using IS DISTINCT FROM means no NULL value can slip past this check.
  --
  --  OLD.role is always set to the value persently stored in the database row.
  --  It is never NULL here because profiles.role has NOT NULL DEFAULT 'admin'.
  --
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION
      'Permission denied: the role column cannot be changed after a profile '
      'is created. Contact a database administrator to modify user roles.'
      USING ERRCODE = 'check_violation';   -- SQLSTATE 23514
  END IF;

  -- ── All other columns (full_name, avatar_url, updated_at) pass through ───
  RETURN NEW;
END;
$$;

-- Drop existing trigger first so this migration is idempotent.
DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;

-- Attach the trigger: fires BEFORE every UPDATE, for every affected row.
-- BEFORE (not AFTER) is required so we can abort the statement before the
-- row reaches the table.
CREATE TRIGGER trg_prevent_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();


-- ═══════════════════════════════════════════════════════════════════════════
--  E.  profiles UPDATE policy — simplified
--      ─────────────────────────────────────
--  The WITH CHECK no longer carries a role sub-query. Role protection is now
--  exclusively handled by the trg_prevent_role_change trigger above, which is
--  stronger and has no NULL edge-case.
--
--  The policy retains only the row-ownership check:
--    USING (auth.uid() = id)        — the user may only target their own row
--    WITH CHECK (auth.uid() = id)   — the updated row must still belong to them
--
--  "profiles: admin can read own profile" SELECT policy is not touched.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles: admin can update own profile" ON public.profiles;

CREATE POLICY "profiles: admin can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING     (auth.uid() = id)   -- row filter:  only the user's own profile row
  WITH CHECK (auth.uid() = id); -- value check: the updated row still belongs to them


-- ═══════════════════════════════════════════════════════════════════════════
--  F.  services — restrict writes to admins
--      ──────────────────────────────────────
--  Exact policy names from migration 001 that are replaced:
--    "services: admin full read"   TO authenticated / USING (TRUE)
--    "services: admin can insert"  TO authenticated / WITH CHECK (TRUE)
--    "services: admin can update"  TO authenticated / USING (TRUE) WITH CHECK (TRUE)
--    "services: admin can delete"  TO authenticated / USING (TRUE)
--
--  UNCHANGED: "services: public can read active"  (anon, is_active = TRUE)
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "services: admin full read"  ON public.services;
DROP POLICY IF EXISTS "services: admin can insert" ON public.services;
DROP POLICY IF EXISTS "services: admin can update" ON public.services;
DROP POLICY IF EXISTS "services: admin can delete" ON public.services;

-- Authenticated admins can read all services (including inactive)
CREATE POLICY "services: admin full read"
  ON public.services FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Only admins may create new service records
CREATE POLICY "services: admin can insert"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Only admins may edit service records
CREATE POLICY "services: admin can update"
  ON public.services FOR UPDATE
  TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only admins may delete service records
CREATE POLICY "services: admin can delete"
  ON public.services FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  G.  projects — restrict writes to admins
--      ──────────────────────────────────────
--  Exact policy names from migration 001 that are replaced:
--    "projects: admin full read"
--    "projects: admin can insert"
--    "projects: admin can update"
--    "projects: admin can delete"
--
--  UNCHANGED: "projects: public can read active"  (anon, is_active = TRUE)
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
--  H.  enquiries — only admins may read or manage submissions
--      ──────────────────────────────────────────────────────
--  Exact policy names from migration 001 that are replaced:
--    "enquiries: admin full read"   TO authenticated / USING (TRUE)
--    "enquiries: admin can update"  TO authenticated / USING (TRUE) WITH CHECK (TRUE)
--    "enquiries: admin can delete"  TO authenticated / USING (TRUE)
--
--  UNCHANGED: "enquiries: public can insert"
--    Public visitors still submit contact form enquiries via the anon role.
--    The WITH CHECK on that policy validates name, email, and message length.
--
--  Intentionally NO SELECT for anon — enquiry data is private visitor PII.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "enquiries: admin full read"  ON public.enquiries;
DROP POLICY IF EXISTS "enquiries: admin can update" ON public.enquiries;
DROP POLICY IF EXISTS "enquiries: admin can delete" ON public.enquiries;

CREATE POLICY "enquiries: admin full read"
  ON public.enquiries FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "enquiries: admin can update"
  ON public.enquiries FOR UPDATE
  TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "enquiries: admin can delete"
  ON public.enquiries FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  I.  media — restrict writes to admins; add missing UPDATE policy
--      ────────────────────────────────────────────────────────────
--  Exact policy names from migration 001 that are replaced:
--    "media: admin full read"   TO authenticated / USING (TRUE)
--    "media: admin can insert"  TO authenticated / WITH CHECK (auth.uid() = uploaded_by)
--    "media: admin can delete"  TO authenticated / USING (auth.uid() = uploaded_by)
--
--  "media: admin can update" did not exist in 001 — it is added here.
--  DROP IF EXISTS handles the case where 002 may have added it already.
--
--  UNCHANGED: "media: public can read"  (anon, TRUE)
--    Image URLs must remain publicly accessible for the public website.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "media: admin full read"  ON public.media;
DROP POLICY IF EXISTS "media: admin can insert" ON public.media;
DROP POLICY IF EXISTS "media: admin can update" ON public.media;
DROP POLICY IF EXISTS "media: admin can delete" ON public.media;

CREATE POLICY "media: admin full read"
  ON public.media FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT: admin identity required AND uploaded_by must match the caller
-- so the registry row is always correctly attributed to the uploader.
CREATE POLICY "media: admin can insert"
  ON public.media FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    AND auth.uid() = uploaded_by
  );

-- UPDATE: admin may edit metadata fields (alt_text, file_name) only.
CREATE POLICY "media: admin can update"
  ON public.media FOR UPDATE
  TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "media: admin can delete"
  ON public.media FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  J.  storage.objects — idempotent admin-only write policies
--      ────────────────────────────────────────────────────────
--  Migration 001 created storage write policies that only checked bucket_id,
--  meaning any authenticated user could upload, overwrite, or delete files.
--
--  DROP IF EXISTS + CREATE handles both states safely:
--    After 001 only: the weak bucket_id-only policies are replaced.
--    After 002:      the already-fixed policies are identically recreated.
--
--  UNCHANGED: "storage media: public read"  (anon SELECT)
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "storage media: admin can upload" ON storage.objects;
DROP POLICY IF EXISTS "storage media: admin can update" ON storage.objects;
DROP POLICY IF EXISTS "storage media: admin can delete" ON storage.objects;

-- Upload: must be an admin AND must target the correct bucket
CREATE POLICY "storage media: admin can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND public.is_admin()
  );

-- Overwrite: Supabase Storage maps file overwrites to UPDATE on storage.objects
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

-- Delete: must be an admin AND must target the correct bucket
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
--  ─────────────────────
--  Run each block separately after the migration to confirm it applied
--  correctly. These are SELECT-only — no data is changed.
--  Uncomment one block at a time in the SQL Editor and run it.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. is_admin(): SECURITY INVOKER, no PUBLIC or anon grant ─────────────
-- Expected: one row — grantee = 'authenticated', privilege_type = 'EXECUTE'
--           prosecdef = false (INVOKER, not DEFINER)
/*
SELECT p.proname, p.prosecdef,
       a.grantee, a.privilege_type
FROM   pg_proc p
LEFT JOIN information_schema.routine_privileges a
       ON a.routine_name   = p.proname
      AND a.routine_schema = 'public'
WHERE  p.proname = 'is_admin'
AND    p.pronamespace = 'public'::regnamespace;
*/

-- ── 2. get_dashboard_stats(): SECURITY DEFINER, search_path set, no PUBLIC grant ──
-- Expected: prosecdef = true, proconfig contains 'search_path=public,pg_catalog'
--           grantee = 'authenticated' only
/*
SELECT p.proname, p.prosecdef, p.proconfig,
       a.grantee, a.privilege_type
FROM   pg_proc p
LEFT JOIN information_schema.routine_privileges a
       ON a.routine_name   = p.proname
      AND a.routine_schema = 'public'
WHERE  p.proname = 'get_dashboard_stats'
AND    p.pronamespace = 'public'::regnamespace;
*/

-- ── 3. set_updated_at() and prevent_role_change() have search_path set ───
/*
SELECT proname, prosecdef, proconfig
FROM   pg_proc
WHERE  proname IN ('set_updated_at', 'prevent_role_change', 'is_admin', 'get_dashboard_stats')
AND    pronamespace = 'public'::regnamespace
ORDER  BY proname;
*/

-- ── 4. trg_prevent_role_change exists as a BEFORE ROW trigger ─────────────
-- Expected: one row — BEFORE | ROW | UPDATE
/*
SELECT trigger_name, event_manipulation, action_timing, action_orientation
FROM   information_schema.triggers
WHERE  event_object_schema = 'public'
AND    event_object_table  = 'profiles'
AND    trigger_name        = 'trg_prevent_role_change';
*/

-- ── 5. profiles UPDATE policy — no role sub-query remains ─────────────────
-- Expected: with_check = '(auth.uid() = id)' only
/*
SELECT policyname, cmd, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
AND    tablename  = 'profiles'
AND    cmd        = 'UPDATE';
*/

-- ── 6. All write policies now require is_admin() ──────────────────────────
-- Expected: every INSERT/UPDATE/DELETE policy in public schema contains
--           'is_admin' in qual or with_check (except enquiries public INSERT)
/*
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
AND    tablename IN ('profiles','services','projects','enquiries','media')
ORDER  BY tablename, cmd;
*/

-- ── 7. No unrestricted write policies survive ─────────────────────────────
-- Expected: 0 rows (any row here is a security gap)
/*
SELECT tablename, policyname, cmd, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
AND    cmd        IN ('INSERT','UPDATE','DELETE')
AND    (qual = 'true' OR with_check = 'true');
*/

-- ── 8. Storage write policies require is_admin() ──────────────────────────
-- Expected: all three write policies show is_admin() in qual/with_check
/*
SELECT policyname, cmd, roles, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'storage'
AND    tablename  = 'objects'
ORDER  BY cmd;
*/

-- ── 9. RLS enabled on all five tables ─────────────────────────────────────
-- Expected: relrowsecurity = true for all five
/*
SELECT relname, relrowsecurity, relforcerowsecurity
FROM   pg_class
WHERE  relnamespace = 'public'::regnamespace
AND    relname IN ('profiles','services','projects','enquiries','media');
*/

-- ── 10. Trigger the role-change guard (should raise check_violation) ───────
-- Run as an authenticated user, NOT as postgres/superuser.
-- Expected: ERROR 23514 — "Permission denied: the role column cannot be changed..."
/*
UPDATE public.profiles
SET    role = 'admin'   -- even setting it to the same value via a different expression
WHERE  id  = auth.uid();
-- ^ Will SUCCEED if role is already 'admin' because OLD.role = NEW.role.
--   To test the block, try: SET role = 'superuser' — that will raise the exception.
UPDATE public.profiles
SET    role = 'superuser'
WHERE  id  = auth.uid();
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- End of migration 003_security_hardening.sql (rev 3 — final)
-- ═══════════════════════════════════════════════════════════════════════════
