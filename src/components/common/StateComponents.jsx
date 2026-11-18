/**
 * Reusable UI state components — loading, empty and error.
 * Keep these small and consistent so every page looks the same
 * when data is in an intermediate state.
 */

import { AlertCircle, Inbox, Loader2 } from 'lucide-react'

/** Full-section spinner */
export function LoadingSpinner({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4" role="status" aria-live="polite">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}

/** Grid of skeleton cards for loading state */
export function SkeletonGrid({ count = 3, cols = 3 }) {
  const colClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[cols] ?? 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 ${colClass} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-0 overflow-hidden">
          <div className="skeleton h-48 w-full rounded-none" />
          <div className="p-5 space-y-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Empty state — no data returned */
export function EmptyState({ title = 'Nothing here yet', message = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
        <Inbox className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      {message && <p className="text-sm text-gray-400 max-w-xs">{message}</p>}
    </div>
  )
}

/** Error state */
export function ErrorState({ message = 'Something went wrong. Please try again.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-700">Failed to load</h3>
      <p className="text-sm text-gray-400 max-w-xs">{message}</p>
    </div>
  )
}
