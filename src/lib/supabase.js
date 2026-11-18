import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client — initialized exclusively from environment variables.
 *
 * Security notes:
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are intentionally public.
 *   The anon key is safe because Supabase Row Level Security (RLS) policies
 *   govern exactly what each unauthenticated or authenticated user may read/write.
 * - The service-role key (which bypasses RLS) must NEVER appear in frontend code.
 * - Credentials are loaded from .env — which is git-ignored.
 *
 * TWO CLIENTS ARE EXPORTED:
 *
 *   supabase        — session-aware client (persistSession: true).
 *                     Use for all admin dashboard operations. Reads the JWT
 *                     from localStorage so authenticated requests carry the
 *                     admin's token and trigger `authenticated`-role RLS policies.
 *
 *   supabasePublic  — session-free client (persistSession: false).
 *                     Use for all public (unauthenticated) operations, e.g. the
 *                     contact form INSERT. Never reads from or writes to
 *                     localStorage, so it always sends requests as the `anon`
 *                     role — even when an admin is logged in the same browser tab.
 *                     This is the architecturally correct client for public writes
 *                     where the RLS policy is scoped TO anon.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly during development if the env vars are missing.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase.js] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your .env file.\n' +
    'Copy .env.example to .env and fill in your Supabase project credentials.'
  )
}

/**
 * Session-aware Supabase client.
 * Use for admin dashboard: authenticated reads, writes, RPCs.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session in localStorage so the user stays logged in on refresh
    persistSession: true,
    // Automatically refresh the JWT before it expires
    autoRefreshToken: true,
    // Detect and restore session from the URL hash after OAuth/magic-link flows
    detectSessionInUrl: true,
  },
})

/**
 * Session-free Supabase client for public (anon-role) operations.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The `supabase` client above has persistSession: true, which means it reads
 * the admin JWT from localStorage and attaches it to every request. If an admin
 * is logged in and a visitor uses the contact form in the same browser tab,
 * `supabase.from('enquiries').insert()` would run as the `authenticated` role —
 * which has NO INSERT policy on enquiries, causing a 42501 RLS violation.
 *
 * This client sets persistSession: false so it never touches localStorage.
 * Every request it makes goes out as the `anon` role, matching the
 * "enquiries: public can insert" RLS policy that is scoped TO anon.
 *
 * Use this client for any public write that must always run as anon:
 *   - Contact form enquiry submission
 */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:    false,  // never read/write localStorage
    autoRefreshToken:  false,  // no session to refresh
    detectSessionInUrl: false, // no OAuth flows for public operations
  },
})
