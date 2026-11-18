/**
 * ConfirmDialog — reusable deletion / destructive-action confirmation modal.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Delete Project"
 *     message="Are you sure? This cannot be undone."
 *     confirmLabel="Delete"          // optional, defaults to "Confirm"
 *     danger                         // optional, makes confirm button red
 *     loading={isDeleting}
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */

import { X, AlertCircle, Loader2 } from 'lucide-react'

export default function ConfirmDialog({
  open,
  title        = 'Are you sure?',
  message      = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  danger       = false,
  loading      = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={!loading ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
          {/* Header */}
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
              <AlertCircle className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 id="confirm-title" className="text-base font-semibold text-gray-900">
                {title}
              </h2>
              <p id="confirm-desc" className="text-sm text-gray-500 mt-1 leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={onCancel}
              disabled={loading}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`${danger ? 'btn-danger' : 'btn-primary'} text-xs px-4 py-2`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Working…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
