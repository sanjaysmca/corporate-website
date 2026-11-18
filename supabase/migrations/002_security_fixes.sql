-- ═══════════════════════════════════════════════════════════════════════════
--  Migration: 002_security_fixes.sql
--  Addresses two gaps identified in 001_initial_schema.sql:
--
--    Fix 1: get_dashboard_stats() must verify the caller has a profile with
--            role = 'admin', not just any authenticated Supabase user.
--
--    Fix 2: Supabase Storage policies for INSERT, UPDATE, and DELETE must
--            verify the caller is an admin. An UPDATE policy was also missing.
--
--  Run AFTER 001_initial_schema.sql in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── Helper: is the current caller an admin? ─────────────────────────────────
--
--  A reusable inline function that checks whether auth.uid() has a row in
--  public.profiles with role = 'admin'.
--
--  Used by:
--    - get_dashboard_stats() body (caller identity check)
--    - Storage RLS policies (WITH CHECK / USING clauses)
--
--  SECURITY INVOKER: runs as the caller — intentionally NOT DEFINER here,
--  so it reads profiles under the caller's RLS context (admins can read their
--  own profile row per the existing policy).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE          -- result won't change within a single statement; allows caching
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.profiles
    WHERE  id   = auth.uid()
    AND    role = 'admin'
  );
$$;

-- Only authenticated users may call this helper (anon cannot evaluate admin status)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ─── Fix 1: Replace get_dashboard_stats() with admin-only version ─────────────
--
--  The original function granted execute to all 'authenticated' users.
--  The replacement adds an explicit public.is_admin() check at the top of
--  the function body and raises an error for non-admin callers.
--
--  SECURITY DEFINER is kept so the sub-queries bypass RLS (counts must include
--  ALL rows, including inactive ones — which public RLS policies filter out).
--  The admin identity is enforced by the explicit is_admin() check instead.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reject callers who do not have an admin profile row.
  -- This is the authoritative check — GRANT scope alone is not sufficient.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: caller is not an admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN json_build_object(
    'total_projects',    (SELECT COUNT(*) FROM public.projects),
    'active_projects',   (SELECT COUNT(*) FROM public.projects  WHERE is_active  = TRUE),
    'featured_projects', (SELECT COUNT(*) FROM public.projects  WHERE is_featured = TRUE),
    'total_services',    (SELECT COUNT(*) FROM public.services),
    'active_services',   (SELECT COUNT(*) FROM public.services  WHERE is_active  = TRUE),
    'total_enquiries',   (SELECT COUNT(*) FROM public.enquiries),
    'new_enquiries',     (SELECT COUNT(*) FROM public.enquiries WHERE status     = 'new'),
    'total_media',       (SELECT COUNT(*) FROM public.media)
  );
END;
$$;

-- Keep the existing GRANT/REVOKE from migration 001 — no change needed here.
-- The is_admin() body check is the second, authoritative gate.


-- ─── Fix 2a: Drop and replace Storage INSERT policy ──────────────────────────
--
--  Original: TO authenticated WITH CHECK (bucket_id = 'media')
--            → Any authenticated user could upload files.
--  Fixed:    WITH CHECK also requires public.is_admin() = TRUE.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "storage media: admin can upload" ON storage.objects;

CREATE POLICY "storage media: admin can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND public.is_admin()
  );


-- ─── Fix 2b: Add missing Storage UPDATE policy ───────────────────────────────
--
--  Supabase Storage maps file overwrites to UPDATE on storage.objects.
--  No UPDATE policy existed in migration 001 — overwrites were blocked for
--  everyone. This adds an admin-only UPDATE policy.
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─── Fix 2c: Drop and replace Storage DELETE policy ──────────────────────────
--
--  Original: TO authenticated USING (bucket_id = 'media')
--            → Any authenticated user could delete files.
--  Fixed:    USING also requires public.is_admin() = TRUE.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "storage media: admin can delete" ON storage.objects;

CREATE POLICY "storage media: admin can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND public.is_admin()
  );


-- ─── Verification queries (run manually to confirm) ──────────────────────────
--
--  After applying this migration, run these in the SQL Editor to confirm:
--
--  1. is_admin() helper exists:
--     SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_admin';
--     → Expected: is_admin | f   (SECURITY INVOKER = prosecdef false)
--
--  2. get_dashboard_stats() is now plpgsql (not sql):
--     SELECT proname, prolang FROM pg_proc WHERE proname = 'get_dashboard_stats';
--
--  3. Storage policies include admin check:
--     SELECT policyname, cmd, qual, with_check
--     FROM pg_policies
--     WHERE tablename = 'objects' AND schemaname = 'storage';
--     → Each write policy should show 'is_admin()' in qual or with_check.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- End of migration 002
