import { createBrowserRouter } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

/**
 * Application router — all routes defined in one place.
 *
 * Structure:
 *   /                      → Public layout
 *   /admin/login           → Public admin login (no guard)
 *   /admin/*               → Protected by ProtectedRoute
 *
 * Page components are imported lazily (React.lazy) to keep the initial bundle
 * small. The public site loads fast; the admin dashboard JS is only fetched
 * when an authenticated user navigates there.
 *
 * Phase 1: Stubs are used for all pages — real implementations added in Phase 2 & 3.
 */

import { lazy, Suspense } from 'react'

// ── Page-level spinner (shown while lazy chunk loads) ──
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function withSuspense(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

// ── Lazy page imports ──
// Public pages
const HomePage    = lazy(() => import('../pages/public/HomePage'))
const AboutPage   = lazy(() => import('../pages/public/AboutPage'))
const ServicesPage= lazy(() => import('../pages/public/ServicesPage'))
const ProjectsPage= lazy(() => import('../pages/public/ProjectsPage'))
const ContactPage = lazy(() => import('../pages/public/ContactPage'))

// Admin pages
const AdminLoginPage    = lazy(() => import('../pages/admin/LoginPage'))
const AdminDashboard    = lazy(() => import('../pages/admin/DashboardPage'))
const AdminProjects     = lazy(() => import('../pages/admin/ProjectsPage'))
const AdminServices     = lazy(() => import('../pages/admin/ServicesPage'))
const AdminEnquiries    = lazy(() => import('../pages/admin/EnquiriesPage'))
const AdminMedia        = lazy(() => import('../pages/admin/MediaPage'))

// Layouts (created in Phase 2)
const PublicLayout = lazy(() => import('../components/common/PublicLayout'))
const AdminLayout  = lazy(() => import('../components/admin/AdminLayout'))

// 404 fallback
const NotFoundPage = lazy(() => import('../pages/public/NotFoundPage'))

const router = createBrowserRouter([
  // ── Public routes ──
  {
    element: withSuspense(PublicLayout),
    children: [
      { path: '/',          element: withSuspense(HomePage) },
      { path: '/about',     element: withSuspense(AboutPage) },
      { path: '/services',  element: withSuspense(ServicesPage) },
      { path: '/projects',  element: withSuspense(ProjectsPage) },
      { path: '/contact',   element: withSuspense(ContactPage) },
    ],
  },

  // ── Admin login (public — no guard) ──
  {
    path: '/admin/login',
    element: withSuspense(AdminLoginPage),
  },

  // ── Protected admin routes ──
  {
    element: <ProtectedRoute />,               // session guard
    children: [
      {
        element: withSuspense(AdminLayout),    // admin shell (sidebar + topbar)
        children: [
          { path: '/admin',            element: withSuspense(AdminDashboard) },
          { path: '/admin/projects',   element: withSuspense(AdminProjects) },
          { path: '/admin/services',   element: withSuspense(AdminServices) },
          { path: '/admin/enquiries',  element: withSuspense(AdminEnquiries) },
          { path: '/admin/media',      element: withSuspense(AdminMedia) },
        ],
      },
    ],
  },

  // ── 404 ──
  { path: '*', element: withSuspense(NotFoundPage) },
])

export default router
