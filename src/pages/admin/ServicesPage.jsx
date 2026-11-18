/**
 * AdminServicesPage — /admin/services
 *
 * Full CRUD for the services table:
 *   - Table listing ALL services (active + inactive)
 *   - Create / Edit modal (react-hook-form + zod)
 *   - Delete with ConfirmDialog
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAdminServices } from '../../hooks/useAdminData'
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/common/StateComponents'
import RecordModal from '../../components/admin/RecordModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'

/* ── Zod schema ─────────────────────────────────────────────────────────── */
const serviceSchema = z.object({
  title:       z.string().min(2, 'Title is required').max(200),
  slug:        z.string().min(2, 'Slug is required').max(200).regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, numbers and hyphens only'),
  description: z.string().min(10, 'Description is required'),
  short_desc:  z.string().max(300).optional().or(z.literal('')),
  icon:        z.string().max(100).optional().or(z.literal('')),
  image_url:   z.string().url('Enter a valid URL').optional().or(z.literal('')),
  is_active:   z.boolean(),
  sort_order:  z.coerce.number().int().min(0),
})

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/* ── Status badge ─────────────────────────────────────────────────────── */
function ActiveBadge({ active }) {
  return active
    ? <span className="badge-green">Active</span>
    : <span className="badge-gray">Inactive</span>
}

/* ── Service form ───────────────────────────────────────────────────────── */
function ServiceForm({ defaultValues, onSave, onCancel }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title:       '',
      slug:        '',
      description: '',
      short_desc:  '',
      icon:        '',
      image_url:   '',
      is_active:   true,
      sort_order:  0,
      ...defaultValues,
    },
  })

  const title = watch('title')

  /* Auto-generate slug only for new records */
  useEffect(() => {
    if (!defaultValues?.slug && title) {
      setValue('slug', slugify(title), { shouldValidate: false })
    }
  }, [title, defaultValues?.slug, setValue])

  async function onSubmit(data) {
    const payload = {
      title:       data.title.trim(),
      slug:        data.slug.trim(),
      description: data.description.trim(),
      short_desc:  data.short_desc?.trim() || null,
      icon:        data.icon?.trim() || null,
      image_url:   data.image_url?.trim() || null,
      is_active:   data.is_active,
      sort_order:  Number(data.sort_order),
    }
    await onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Title */}
      <div>
        <label className="label" htmlFor="s-title">Title <span className="text-red-500">*</span></label>
        <input id="s-title" className={`input ${errors.title ? 'border-red-400' : ''}`} placeholder="Web Development" {...register('title')} />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </div>

      {/* Slug */}
      <div>
        <label className="label" htmlFor="s-slug">Slug <span className="text-red-500">*</span></label>
        <input id="s-slug" className={`input font-mono text-sm ${errors.slug ? 'border-red-400' : ''}`} placeholder="web-development" {...register('slug')} />
        {errors.slug && <p className="field-error">{errors.slug.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="label" htmlFor="s-desc">Description <span className="text-red-500">*</span></label>
        <textarea id="s-desc" rows={3} className={`input resize-y ${errors.description ? 'border-red-400' : ''}`} placeholder="Full service description…" {...register('description')} />
        {errors.description && <p className="field-error">{errors.description.message}</p>}
      </div>

      {/* Short description */}
      <div>
        <label className="label" htmlFor="s-short">Short Description</label>
        <input id="s-short" className="input" placeholder="One-line summary" {...register('short_desc')} />
      </div>

      {/* Icon + Image URL */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="s-icon">
            Icon <span className="text-xs font-normal text-gray-400">(lucide name)</span>
          </label>
          <input id="s-icon" className="input" placeholder="code" {...register('icon')} />
        </div>
        <div>
          <label className="label" htmlFor="s-img">Image URL</label>
          <input id="s-img" className={`input ${errors.image_url ? 'border-red-400' : ''}`} placeholder="https://…" {...register('image_url')} />
          {errors.image_url && <p className="field-error">{errors.image_url.message}</p>}
        </div>
      </div>

      {/* Sort order + Active */}
      <div className="flex items-end gap-6">
        <div className="w-32">
          <label className="label" htmlFor="s-sort">Sort Order</label>
          <input id="s-sort" type="number" min="0" className="input" {...register('sort_order')} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
          <input type="checkbox" className="w-4 h-4 rounded accent-primary-600" {...register('is_active')} />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm px-4 py-2">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary text-sm px-4 py-2">
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Service'}
        </button>
      </div>
    </form>
  )
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function AdminServicesPage() {
  const { services, loading, error, refresh } = useAdminServices()
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState({ open: false, record: null })
  const [delTarget, setDelTarget] = useState(null)
  const [deleting,  setDeleting]  = useState(false)

  /* ── Filtered list ── */
  const filtered = services.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase())
  )

  /* ── Save ── */
  async function handleSave(payload) {
    const isEdit = !!modal.record?.id
    const { error } = isEdit
      ? await supabase.from('services').update(payload).eq('id', modal.record.id)
      : await supabase.from('services').insert([payload])

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(isEdit ? 'Service updated.' : 'Service created.')
      setModal({ open: false, record: null })
      refresh()
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!delTarget) return
    setDeleting(true)
    const { error } = await supabase.from('services').delete().eq('id', delTarget.id)
    setDeleting(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Service deleted.')
      setDelTarget(null)
      refresh()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">{services.length} total service{services.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary self-start sm:self-auto" onClick={() => setModal({ open: true, record: null })}>
          <Plus className="w-4 h-4" /> New Service
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          placeholder="Search services…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* ── States ── */}
      {loading && <LoadingSpinner message="Loading services…" />}
      {error   && <ErrorState message={error} />}

      {/* ── Table ── */}
      {!loading && !error && (
        filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No results' : 'No services yet'}
            message={search ? 'Try a different search term.' : 'Create your first service using the button above.'}
          />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Title</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Icon</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Sort</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 truncate max-w-[200px]">{s.title}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                      {s.icon ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.sort_order}</td>
                    <td className="px-4 py-3"><ActiveBadge active={s.is_active} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setModal({ open: true, record: s })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDelTarget(s)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Modals ── */}
      <RecordModal
        open={modal.open}
        title={modal.record ? 'Edit Service' : 'New Service'}
        onClose={() => setModal({ open: false, record: null })}
      >
        <ServiceForm
          defaultValues={modal.record}
          onSave={handleSave}
          onCancel={() => setModal({ open: false, record: null })}
        />
      </RecordModal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete Service"
        message={`Delete "${delTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  )
}
