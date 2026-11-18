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
