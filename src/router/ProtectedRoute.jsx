import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute — guards all /admin/* routes.
 *
 * Behaviour:
 * - While the session is loading (first render), shows nothing — prevents a
 *   flash where an authenticated admin is briefly redirected to /admin/login.
 * - If no session exists, redirects to /admin/login and preserves the
 *   attempted URL in `state.from` so we can redirect back after login.
 * - If a session exists, renders the nested route via <Outlet />.
 *
 * Note: This is the FIRST line of defence. The SECOND (and authoritative) line
 * of defence is Supabase Row Level Security — even if someone bypasses this
 * React guard, the database will reject their requests.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Wait for the session check to complete before making a routing decision
  if (loading) {
    return (
      <div className="loading-overlay" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    )
  }

  // Not authenticated — redirect to login, preserving the target URL
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // Authenticated — render the matched child route
  return <Outlet />
}
