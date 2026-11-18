/**
 * RecordModal — reusable Create / Edit slide-over modal.
 *
 * Usage:
 *   <RecordModal
 *     open={showModal}
 *     title="New Project"
 *     onClose={() => setShowModal(false)}
 *   >
 *     <form>…</form>
 *   </RecordModal>
 *
 * The modal traps the content area in a scroll. The title bar and the close
 * button stay fixed. Children supply the form and action buttons.
 */

import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function RecordModal({ open, title, onClose, children, wide = false }) {
  /* Close on Escape */
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* Lock body scroll while open */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 lg:p-8"
      >
        <div
          className={`relative bg-white rounded-2xl shadow-2xl flex flex-col
            w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}
            max-h-[calc(100vh-2rem)] animate-slide-up`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-6 py-5">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
