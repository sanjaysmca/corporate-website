/**
 * AdminEnquiriesPage — /admin/enquiries
 *
 * - Table of all enquiries, sorted newest first.
 * - Filter chips by status (all / new / read / replied / closed).
 * - Click any row → slide-over detail panel showing full message.
 * - Status update dropdown inside the detail panel.
 * - Admin notes field.
 *
 * DB status values: 'new' | 'read' | 'replied' | 'closed'  (migration 001)
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, Eye, ChevronDown, Mail, Phone, Calendar, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAdminEnquiries } from '../../hooks/useAdminData'
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/common/StateComponents'
import RecordModal from '../../components/admin/RecordModal'
import { format, formatDistanceToNow } from 'date-fns'

/* ── Status config ──────────────────────────────────────────────────────── */
const STATUSES = [
  { value: '',        label: 'All' },
  { value: 'new',     label: 'New' },
  { value: 'read',    label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed',  label: 'Closed' },
]

const STATUS_STYLES = {
  new:     'badge-blue',
  read:    'badge-yellow',
  replied: 'badge-green',
  closed:  'badge-gray',
}

function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] ?? 'badge-gray'}`}>
      {status ?? '—'}
    </span>
  )
}

/* ── Detail modal content ───────────────────────────────────────────────── */
function EnquiryDetail({ enquiry, onClose, onUpdated }) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      status:      enquiry.status,
      admin_notes: enquiry.admin_notes ?? '',
    },
  })

  const currentStatus = watch('status')

  async function onSubmit(data) {
    setSaving(true)
    const { error } = await supabase
      .from('enquiries')
      .update({ status: data.status, admin_notes: data.admin_notes || null })
      .eq('id', enquiry.id)
    setSaving(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Enquiry updated.')
      onUpdated()
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Sender info */}
      <div className="rounded-xl bg-gray-50 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-700">{enquiry.name?.charAt(0).toUpperCase()}</span>
          </div>
          <span className="font-semibold text-gray-800">{enquiry.name}</span>
          <StatusBadge status={enquiry.status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Mail className="w-3.5 h-3.5" />
          <a href={`mailto:${enquiry.email}`} className="hover:text-primary-600">{enquiry.email}</a>
        </div>
        {enquiry.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="w-3.5 h-3.5" />
            <span>{enquiry.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(new Date(enquiry.created_at), 'dd MMM yyyy, hh:mm a')}</span>
        </div>
      </div>

      {/* Subject */}
      {enquiry.subject && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject</p>
          <p className="text-sm font-medium text-gray-800">{enquiry.subject}</p>
        </div>
      )}

      {/* Message */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Message</p>
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3.5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {enquiry.message}
        </div>
      </div>

      {/* Status update */}
      <div>
        <label className="label" htmlFor="enq-status">Update Status</label>
        <div className="relative">
          <select
            id="enq-status"
            className="input appearance-none pr-8"
            {...register('status')}
          >
            {STATUSES.filter(s => s.value).map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Admin notes */}
      <div>
        <label className="label" htmlFor="enq-notes">Admin Notes</label>
        <textarea
          id="enq-notes"
          rows={3}
          className="input resize-y"
          placeholder="Internal notes (not visible to the sender)…"
          {...register('admin_notes')}
        />
      </div>

      {/* Reply shortcut */}
      <a
        href={`mailto:${enquiry.email}?subject=Re: ${encodeURIComponent(enquiry.subject || 'Your enquiry')}`}
        className="inline-flex items-center gap-2 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors no-underline"
      >
        <Mail className="w-3.5 h-3.5" />
        Reply via email client
      </a>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function AdminEnquiriesPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const { enquiries, loading, error, refresh } = useAdminEnquiries(statusFilter)
  const [selected, setSelected] = useState(null)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {enquiries.length} enquir{enquiries.length !== 1 ? 'ies' : 'y'}{statusFilter ? ` · ${statusFilter}` : ''}
        </p>
      </div>

      {/* ── Status filter chips ── */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s.value
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── States ── */}
      {loading && <LoadingSpinner message="Loading enquiries…" />}
      {error   && <ErrorState message={error} />}

      {/* ── Table ── */}
      {!loading && !error && (
        enquiries.length === 0 ? (
          <EmptyState
            title={statusFilter ? 'No enquiries with this status' : 'No enquiries yet'}
            message={statusFilter ? 'Try a different status filter.' : 'Enquiries submitted via the contact form will appear here.'}
          />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">From</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Subject</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enquiries.map(enq => (
                  <tr
                    key={enq.id}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => setSelected(enq)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{enq.name}</p>
                      <p className="text-xs text-gray-400">{enq.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[200px] truncate">
                      {enq.subject || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {formatDistanceToNow(new Date(enq.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={enq.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(enq) }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Detail modal ── */}
      {selected && (
        <RecordModal
          open={!!selected}
          title="Enquiry Detail"
          onClose={() => setSelected(null)}
        >
          <EnquiryDetail
            enquiry={selected}
            onClose={() => setSelected(null)}
            onUpdated={refresh}
          />
        </RecordModal>
      )}
    </div>
  )
}
