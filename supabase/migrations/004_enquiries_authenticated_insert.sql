-- ═══════════════════════════════════════════════════════════════════════════
--  Migration:  004_enquiries_authenticated_insert.sql
--  Project:    Corporate Website + Admin Dashboard
--  Depends on: 001_initial_schema.sql, 003_security_hardening.sql
--
--  PROBLEM
--  ───────
--  The "enquiries: public can insert" policy (from migration 001) is scoped
--  TO anon only. The `authenticated` role has no INSERT policy on enquiries.
--
--  When an admin is logged in, the shared supabase-js client (persistSession:
--  true) attaches the admin's JWT to every request — including contact form
--  submissions. PostgREST assigns the `authenticated` role to that request.
--  Since no INSERT policy exists for `authenticated`, PostgreSQL raises:
--
--      42501: new row violates row-level security policy for table "enquiries"
--
--  PRIMARY FIX
--  ───────────
--  The primary fix is architectural: ContactPage.jsx now uses `supabasePublic`,
--  a separate client instance with persistSession: false. It never reads from
--  localStorage, so it always sends requests as `anon` — the correct role for
--  the public contact form. That client-side change alone resolves the error.
--
--  WHY THIS MIGRATION IS STILL NEEDED (defence-in-depth)
--  ──────────────────────────────────────────────────────
--  1. Any future code path that uses the session-aware client for a contact
--     form equivalent would immediately break without a DB-level policy.
--  2. Admin users legitimately testing the contact form from their own browser
--     while logged in would otherwise be unable to submit — a confusing UX.
--  3. Belt-and-suspenders: the database should never rely solely on correct
--     client-side role selection.
--
--  SECURITY PROPERTIES PRESERVED
--  ──────────────────────────────
--  • WITH CHECK is identical to the anon policy — strict data validation.
--  • No SELECT policy is added for authenticated or anon (enquiries remain
--    private: only admins with is_admin() can read them).
--  • RLS remains ENABLED on enquiries.
--  • is_admin() is NOT required for INSERT — this is intentional. Any
--    authenticated user (which in this system means only admins, since there
--    is no public registration) may submit an enquiry, just like a visitor.
--  • WITH CHECK (TRUE) is NOT used.
--  • The service-role key is not referenced anywhere.
--
--  IDEMPOTENCY
--  ───────────
--  DROP POLICY IF EXISTS before CREATE makes this safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Drop first so the migration is idempotent.
DROP POLICY IF EXISTS "enquiries: authenticated can insert" ON public.enquiries;

-- Allow authenticated users (in practice, admins — the only accounts that
-- exist) to submit enquiries through the contact form.
-- The WITH CHECK mirrors the anon policy and the DB CHECK constraints exactly.
CREATE POLICY "enquiries: authenticated can insert"
  ON public.enquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    char_length(name)    BETWEEN 2 AND 100          AND
    email               ~* '^[^@]+@[^@]+\.[^@]+$'  AND
    char_length(message) BETWEEN 10 AND 5000
  );

COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
--  VERIFICATION
--  ─────────────
--  Run this after applying the migration to confirm both INSERT policies exist:
--
--  SELECT policyname, roles, cmd, with_check
--  FROM   pg_policies
--  WHERE  schemaname = 'public'
--  AND    tablename  = 'enquiries'
--  AND    cmd        = 'INSERT'
--  ORDER  BY policyname;
--
--  Expected result — 2 rows:
--    enquiries: authenticated can insert | {authenticated} | INSERT | (validation)
--    enquiries: public can insert        | {anon}          | INSERT | (validation)
--
--  Confirm no SELECT policy exists for anon (enquiries remain private):
--
--  SELECT policyname, roles, cmd
--  FROM   pg_policies
--  WHERE  schemaname = 'public'
--  AND    tablename  = 'enquiries'
--  AND    cmd        = 'SELECT';
--
--  Expected result — 1 row only:
--    enquiries: admin full read | {authenticated} | SELECT
-- ═══════════════════════════════════════════════════════════════════════════
