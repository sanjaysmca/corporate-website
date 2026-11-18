import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * AuthContext — provides the current Supabase session and user to the whole tree.
 *
 * Design decisions:
 * - `loading` starts true so that ProtectedRoute can wait before deciding to
 *   redirect. Without this, there is a flash where an authenticated user is
 *   momentarily redirected to /admin/login.
 * - We subscribe to onAuthStateChange so the context always reflects the
 *   real-time session state (login, logout, token refresh).
 * - No sign-up method is exposed here — admin accounts are created manually
 *   in the Supabase dashboard (no public registration).
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)   // Supabase Session object | null
  const [user, setUser]       = useState(null)   // Supabase User object | null
  const [loading, setLoading] = useState(true)   // true until first session check resolves

  useEffect(() => {
    // 1. Restore session synchronously from localStorage (if one exists)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Subscribe to future auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe()
  }, [])

  /**
   * Sign in with email and password.
   * Returns { error } — the caller is responsible for showing the error message.
   */
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  /**
   * Sign out the current user and clear the session.
   */
  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user,
    loading,
    isAuthenticated: !!session,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth — convenience hook so components don't need to import AuthContext directly.
 * Throws if used outside <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>. Check your component tree.')
  }
  return context
}
