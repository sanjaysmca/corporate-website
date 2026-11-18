/**
 * DashboardPage — /admin
 *
 * Shows aggregate stats from get_dashboard_stats() RPC and the 5 most
 * recent enquiries. All data is fetched from Supabase — nothing is hardcoded.
 */

import { Link } from 'react-router-dom'
import {
  FolderKanban,
  Wrench,
  MessageSquare,
  ImageIcon,
  TrendingUp,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { useDashboardStats, useRecentEnquiries } from '../../hooks/useAdminData'
import { formatDistanceToNow } from 'date-fns'

/* ── Status badge ───────────────────────────────────────────────────────── */
const STATUS_STYLES = {
  new:     'badge-blue',
  read:    'badge-yellow',
  replied: 'badge-green',
  closed:  'badge-gray',
}

const STATUS_LABELS = {
  new:     'New',
  read:    'Read',
  replied: 'Replied',
  closed:  'Closed',
}

function StatusBadge({ status }) {
  return (
    <span className={STATUS_STYLES[status] ?? 'badge-gray'}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, iconBg, loading }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        {loading ? (
          <div className="skeleton h-7 w-12 rounded" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        )}
        {sub && !loading && (
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  )
}

/* ── DashboardPage ──────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats()
  const { enquiries, loading: enqLoading }                   = useRecentEnquiries(5)

  const stat  = key => stats?.[key] ?? 0

  const STAT_CARDS = [
    {
      label:  'Total Projects',
      value:  stat('total_projects'),
      sub:    `${stat('active_projects')} active`,
      icon:   FolderKanban,
      iconBg: 'bg-primary-600',
    },
    {
      label:  'Total Services',
      value:  stat('total_services'),
      sub:    `${stat('active_services')} active`,
      icon:   Wrench,
      iconBg: 'bg-violet-600',
    },
    {
      label:  'Total Enquiries',
      value:  stat('total_enquiries'),
      sub:    `${stat('new_enquiries')} new`,
      icon:   MessageSquare,
      iconBg: 'bg-amber-500',
    },
    {
      label:  'Media Files',
      value:  stat('total_media'),
      sub:    'uploaded images',
      icon:   ImageIcon,
      iconBg: 'bg-emerald-600',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your website content and enquiries.
        </p>
      </div>

      {/* ── Stats error ── */}
      {statsError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            Failed to load statistics: {statsError}
          </p>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => (
          <StatCard key={card.label} {...card} loading={statsLoading} />
        ))}
      </div>

      {/* ── Secondary stats row ── */}
      {!statsLoading && !statsError && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <div>
              <p className="text-xs text-gray-500">Featured Projects</p>
              <p className="text-lg font-bold text-gray-900">{stat('featured_projects')}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <FolderKanban className="w-5 h-5 text-violet-600" />
            <div>
              <p className="text-xs text-gray-500">Active Projects</p>
              <p className="text-lg font-bold text-gray-900">{stat('active_projects')}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs text-gray-500">New Enquiries</p>
              <p className="text-lg font-bold text-gray-900">{stat('new_enquiries')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Enquiries ── */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Recent Enquiries</h2>
          <Link
            to="/admin/enquiries"
            className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 no-underline"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {enqLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : enquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No enquiries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {enquiries.map(enq => (
              <div key={enq.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                {/* Avatar initials */}
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary-700">
                    {enq.name?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{enq.name}</p>
                  <p className="text-xs text-gray-400 truncate">{enq.subject || enq.email}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={enq.status} />
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {formatDistanceToNow(new Date(enq.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/admin/projects',  label: 'Manage Projects',  icon: FolderKanban },
          { to: '/admin/services',  label: 'Manage Services',  icon: Wrench },
          { to: '/admin/enquiries', label: 'View Enquiries',   icon: MessageSquare },
          { to: '/admin/media',     label: 'Upload Media',     icon: ImageIcon },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="card flex items-center gap-3 p-4 hover:border-primary-300 hover:shadow-sm transition-all no-underline group"
          >
            <Icon className="w-5 h-5 text-primary-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-primary-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
