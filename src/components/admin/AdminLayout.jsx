/**
 * AdminLayout — the persistent shell wrapping all /admin/* pages.
 *
 * Structure:
 *   <div full-height>
 *     <Sidebar />           ← fixed left column on md+, hidden on mobile
 *     <div flex-col flex-1>
 *       <Topbar />          ← fixed top bar; hamburger on mobile
 *       <main>              ← scrollable content area
 *         <Outlet />
 *       </main>
 *     </div>
 *   </div>
 *
 * Responsive behaviour:
 *   Mobile  — sidebar is an off-canvas overlay, toggled by the hamburger
 *   Tablet+ — sidebar is always visible (w-64)
 */

import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Wrench,
  MessageSquare,
  ImageIcon,
  LogOut,
  Menu,
  X,
  Zap,
  User,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAdminProfile } from '../../hooks/useAdminData'

/* ── Navigation items ──────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { to: '/admin',            label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/projects',   label: 'Projects',   icon: FolderKanban },
  { to: '/admin/services',   label: 'Services',   icon: Wrench },
  { to: '/admin/enquiries',  label: 'Enquiries',  icon: MessageSquare },
  { to: '/admin/media',      label: 'Media',      icon: ImageIcon },
]

/* ── Sidebar ────────────────────────────────────────────────────────────── */
function Sidebar({ onClose }) {
  return (
    <aside className="flex flex-col h-full bg-gray-900 text-white">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">NexusCorp</span>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav label */}
      <p className="px-5 pt-5 pb-2 text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
        Main Menu
      </p>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom divider */}
      <div className="border-t border-gray-700/60 px-3 py-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          View Public Site
        </a>
      </div>
    </aside>
  )
}

/* ── Topbar ─────────────────────────────────────────────────────────────── */
function Topbar({ onMenuClick, profile }) {
  const { signOut } = useAuth()
  const navigate    = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  const displayName = profile?.full_name ?? 'Admin'
  const initials    = displayName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="flex items-center justify-between gap-4 px-4 md:px-6 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
      {/* Left: hamburger (mobile) + page breadcrumb placeholder */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-800 hidden sm:block">Admin Dashboard</span>
      </div>

      {/* Right: profile + sign-out */}
      <div className="flex items-center gap-3">
        {/* Avatar + name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary-700">{initials || <User className="w-4 h-4" />}</span>
            )}
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-semibold text-gray-800">{displayName}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Administrator</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-200 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  )
}

/* ── AdminLayout ────────────────────────────────────────────────────────── */
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user }                      = useAuth()
  const { profile }                   = useAdminProfile(user?.id)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar — desktop (always visible) ── */}
      <div className="hidden md:flex md:w-64 md:flex-col md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* ── Sidebar — mobile overlay ── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden flex flex-col">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          profile={profile}
        />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
