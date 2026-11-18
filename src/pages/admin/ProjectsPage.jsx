/**
 * AdminProjectsPage — /admin/projects
 *
 * Full CRUD for the projects table:
 *   - Table listing ALL projects (active + inactive)
 *   - Create / Edit slide-over modal (react-hook-form + zod)
 *   - Delete with ConfirmDialog
 *   - Auto-generated slug from title (editable)
 *   - Supabase INSERT / UPDATE / DELETE via RLS (is_admin() required)
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Loader2, Search, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAdminProjects } from '../../hooks/useAdminData'
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/common/StateComponents'
import RecordModal from '../../components/admin/RecordModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import { format } from 'date-fns'

/* ── Zod schema ─────────────────────────────────────────────────────────── */
const projectSchema = z.object({
  title:        z.string().min(2, 'Title is required').max(200),
  slug:         z.string().min(2, 'Slug is required').max(200).regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, numbers and hyphens only'),
  description:  z.string().min(10, 'Description is required'),
  short_desc:   z.string().max(300).optional().or(z.literal('')),
  client_name:  z.string().max(100).optional().or(z.literal('')),
  category:     z.string().max(100).optional().or(z.literal('')),
  tags:         z.string().optional(),             // comma-separated → array on submit
  image_url:    z.string().url('Enter a valid URL').optional().or(z.literal('')),
  is_featured:  z.boolean(),
  is_active:    z.boolean(),
  completed_at: z.string().optional().or(z.literal('')),
  sort_order:   z.coerce.number().int().min(0),
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

function tagsToString(tags) {
  if (!tags || !Array.isArray(tags)) return ''
  return tags.join(', ')
}

function stringToTags(str) {
  if (!str) return []
  return str.split(',').map(t => t.trim()).filter(Boolean)
}

/* ── Status badge ─────────────────────────────────────────────────────── */
function ActiveBadge({ active }) {
  return active
    ? <span className="badge-green">Active</span>
    : <span className="badge-gray">Inactive</span>
}

/* ── Project form (used inside modal) ──────────────────────────────────── */
function ProjectForm({ defaultValues, onSave, onCancel }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title:        '',
      slug:         '',
      description:  '',
      short_desc:   '',
      client_name:  '',
      category:     '',
      tags:         '',
      image_url:    '',
      is_featured:  false,
      is_active:    true,
      completed_at: '',
      sort_order:   0,
      ...defaultValues,
    },
  })

  const title = watch('title')

  /* Auto-generate slug only for new records (no existing slug) */
  useEffect(() => {
    if (!defaultValues?.slug && title) {
      setValue('slug', slugify(title), { shouldValidate: false })
    }
  }, [title, defaultValues?.slug, setValue])

  async function onSubmit(data) {
    const payload = {
      title:        data.title.trim(),
      slug:         data.slug.trim(),
      description:  data.description.trim(),
      short_desc:   data.short_desc?.trim() || null,
      client_name:  data.client_name?.trim() || null,
      category:     data.category?.trim() || null,
      tags:         stringToTags(data.tags),
      image_url:    data.image_url?.trim() || null,
      is_featured:  data.is_featured,
      is_active:    data.is_active,
      completed_at: data.completed_at || null,
      sort_order:   Number(data.sort_order),
    }
    await onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Title */}
      <div>
        <label className="label" htmlFor="p-title">Title <span className="text-red-500">*</span></label>
        <input id="p-title" className={`input ${errors.title ? 'border-red-400' : ''}`} placeholder="My Awesome Project" {...register('title')} />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </div>

      {/* Slug */}
      <div>
        <label className="label" htmlFor="p-slug">Slug <span className="text-red-500">*</span></label>
        <input id="p-slug" className={`input font-mono text-sm ${errors.slug ? 'border-red-400' : ''}`} placeholder="my-awesome-project" {...register('slug')} />
        {errors.slug && <p className="field-error">{errors.slug.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="label" htmlFor="p-desc">Description <span className="text-red-500">*</span></label>
        <textarea id="p-desc" rows={3} className={`input resize-y ${errors.description ? 'border-red-400' : ''}`} placeholder="Full project description…" {...register('description')} />
        {errors.description && <p className="field-error">{errors.description.message}</p>}
      </div>

      {/* Short description */}
      <div>
        <label className="label" htmlFor="p-short">Short Description</label>
        <input id="p-short" className="input" placeholder="One-line summary" {...register('short_desc')} />
      </div>

      {/* Client + Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="p-client">Client Name</label>
          <input id="p-client" className="input" placeholder="Acme Corp" {...register('client_name')} />
        </div>
        <div>
          <label className="label" htmlFor="p-cat">Category</label>
          <input id="p-cat" className="input" placeholder="Web App" {...register('category')} />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="label" htmlFor="p-tags">Tags <span className="text-xs font-normal text-gray-400">(comma-separated)</span></label>
        <input id="p-tags" className="input" placeholder="React, Node.js, PostgreSQL" {...register('tags')} />
      </div>

      {/* Image URL */}
      <div>
        <label className="label" htmlFor="p-img">Image URL</label>
        <input id="p-img" className={`input ${errors.image_url ? 'border-red-400' : ''}`} placeholder="https://…" {...register('image_url')} />
        {errors.image_url && <p className="field-error">{errors.image_url.message}</p>}
      </div>

      {/* Completion date + Sort order */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="p-date">Completed Date</label>
          <input id="p-date" type="date" className="input" {...register('completed_at')} />
        </div>
        <div>
          <label className="label" htmlFor="p-sort">Sort Order</label>
          <input id="p-sort" type="number" min="0" className="input" {...register('sort_order')} />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 rounded accent-primary-600" {...register('is_active')} />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 rounded accent-primary-600" {...register('is_featured')} />
          <span className="text-sm font-medium text-gray-700">Featured</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm px-4 py-2">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary text-sm px-4 py-2">
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Project'}
        </button>
      </div>
    </form>
  )
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function AdminProjectsPage() {
  const { projects, loading, error, refresh } = useAdminProjects()
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState({ open: false, record: null })   // create / edit
  const [delTarget, setDelTarget] = useState(null)   // record to delete
  const [deleting,  setDeleting]  = useState(false)

  /* ── Filtered list ── */
  const filtered = projects.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  )

  /* ── Save (create or update) ── */
  async function handleSave(payload) {
    const isEdit = !!modal.record?.id

    const { error } = isEdit
      ? await supabase.from('projects').update(payload).eq('id', modal.record.id)
      : await supabase.from('projects').insert([payload])

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(isEdit ? 'Project updated.' : 'Project created.')
      setModal({ open: false, record: null })
      refresh()
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!delTarget) return
    setDeleting(true)
    const { error } = await supabase.from('projects').delete().eq('id', delTarget.id)
    setDeleting(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Project deleted.')
      setDelTarget(null)
      refresh()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} total project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary self-start sm:self-auto" onClick={() => setModal({ open: true, record: null })}>
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          placeholder="Search projects…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* ── States ── */}
      {loading && <LoadingSpinner message="Loading projects…" />}
      {error   && <ErrorState message={error} />}

      {/* ── Table ── */}
      {!loading && !error && (
        filtered.length === 0 ? (
          <EmptyState title={search ? 'No results' : 'No projects yet'} message={search ? 'Try a different search term.' : 'Create your first project using the button above.'} />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Title</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 truncate max-w-[200px]">{p.title}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.category ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">
                      {p.completed_at ? format(new Date(p.completed_at), 'MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <ActiveBadge active={p.is_active} />
                        {p.is_featured && <span className="badge-blue">Featured</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setModal({ open: true, record: { ...p, tags: tagsToString(p.tags) } })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDelTarget(p)}
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

      {/* ── Create / Edit modal ── */}
      <RecordModal
        open={modal.open}
        title={modal.record ? 'Edit Project' : 'New Project'}
        onClose={() => setModal({ open: false, record: null })}
        wide
      >
        <ProjectForm
          defaultValues={modal.record}
          onSave={handleSave}
          onCancel={() => setModal({ open: false, record: null })}
        />
      </RecordModal>

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!delTarget}
        title="Delete Project"
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
