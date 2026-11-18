/**
 * AdminMediaPage — /admin/media
 *
 * - Grid of all uploaded images from the media table.
 * - Upload: file input → validate type/size → upload to Supabase Storage
 *   → insert row into media table.
 * - Delete: remove from storage AND delete the media row.
 * - File validation: max 10 MB, image types only.
 * - Shows upload progress and error/success feedback.
 *
 * Security: all Storage operations go through the anon key.
 * The "storage media: admin can upload/delete" RLS policies (migration 003)
 * enforce that only admins can write to the bucket.
 */

import { useState, useRef } from 'react'
import { Upload, Trash2, Loader2, ImageIcon, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAdminMedia } from '../../hooks/useAdminData'
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/common/StateComponents'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'

/* ── Constants ──────────────────────────────────────────────────────────── */
const MAX_SIZE_BYTES  = 10 * 1024 * 1024    // 10 MB
const ALLOWED_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const BUCKET          = 'media'

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileExtension(mimeType) {
  const map = {
    'image/jpeg':   'jpg',
    'image/png':    'png',
    'image/webp':   'webp',
    'image/gif':    'gif',
    'image/svg+xml':'svg',
  }
  return map[mimeType] ?? 'bin'
}

/* ── Upload dropzone / button ───────────────────────────────────────────── */
function UploadZone({ onUpload, uploading }) {
  const inputRef   = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files) {
    const file = files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`File type not allowed. Use: JPEG, PNG, WebP, GIF, SVG.`)
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`File is too large. Maximum size is 10 MB (got ${formatBytes(file.size)}).`)
      return
    }

    onUpload(file)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3
        cursor-pointer transition-colors text-center
        ${dragging  ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}
        ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
        disabled={uploading}
      />
      {uploading ? (
        <>
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Uploading…</p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Drop an image here, or click to select</p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF, SVG · Max 10 MB</p>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Media card ─────────────────────────────────────────────────────────── */
function MediaCard({ item, onDelete }) {
  const [copied, setCopied] = useState(false)

  function copyUrl() {
    navigator.clipboard.writeText(item.public_url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="card group relative overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-40 bg-gray-100 overflow-hidden">
        <img
          src={item.public_url}
          alt={item.alt_text || item.file_name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={e => { e.target.style.display = 'none' }}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={copyUrl}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Copy URL"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-white/20 hover:bg-red-500/80 text-white transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="p-3">
        <p className="text-xs font-medium text-gray-700 truncate" title={item.file_name}>{item.file_name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(item.file_size ?? 0)} · {item.mime_type?.split('/')[1]?.toUpperCase()}</p>
      </div>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function AdminMediaPage() {
  const { user }                          = useAuth()
  const { media, loading, error, refresh } = useAdminMedia()
  const [uploading,  setUploading]         = useState(false)
  const [delTarget,  setDelTarget]         = useState(null)
  const [deleting,   setDeleting]          = useState(false)

  /* ── Upload ── */
  async function handleUpload(file) {
    setUploading(true)

    // Build a unique storage path: timestamp_filename
    const ext  = fileExtension(file.type)
    const name = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const path = `uploads/${name}`

    // 1. Upload file to Supabase Storage
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (upErr) {
      toast.error(`Upload failed: ${upErr.message}`)
      setUploading(false)
      return
    }

    // 2. Get the public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData?.publicUrl

    // 3. Insert record into the media table
    const { error: dbErr } = await supabase.from('media').insert([{
      file_name:    file.name,
      storage_path: path,
      public_url:   publicUrl,
      mime_type:    file.type,
      file_size:    file.size,
      uploaded_by:  user?.id ?? null,
    }])

    if (dbErr) {
      // Attempt to clean up the storage file if DB insert fails
      await supabase.storage.from(BUCKET).remove([path])
      toast.error(`Database insert failed: ${dbErr.message}`)
    } else {
      toast.success('Image uploaded successfully.')
      refresh()
    }

    setUploading(false)
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!delTarget) return
    setDeleting(true)

    // 1. Remove from storage
    const { error: storErr } = await supabase.storage
      .from(BUCKET)
      .remove([delTarget.storage_path])

    // 2. Delete the DB record (even if storage removal failed — keep DB clean)
    const { error: dbErr } = await supabase.from('media').delete().eq('id', delTarget.id)

    setDeleting(false)

    if (storErr || dbErr) {
      toast.error((storErr ?? dbErr).message)
    } else {
      toast.success('Image deleted.')
      setDelTarget(null)
      refresh()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
        <p className="text-sm text-gray-500 mt-0.5">{media.length} image{media.length !== 1 ? 's' : ''} uploaded</p>
      </div>

      {/* ── Upload zone ── */}
      <UploadZone onUpload={handleUpload} uploading={uploading} />

      {/* ── States ── */}
      {loading && <LoadingSpinner message="Loading media…" />}
      {error   && <ErrorState message={error} />}

      {/* ── Grid ── */}
      {!loading && !error && (
        media.length === 0 ? (
          <EmptyState
            title="No images uploaded yet"
            message="Drag and drop an image above, or click the zone to select a file."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {media.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                onDelete={() => setDelTarget(item)}
              />
            ))}
          </div>
        )
      )}

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!delTarget}
        title="Delete Image"
        message={`Permanently delete "${delTarget?.file_name}"? This removes the file from storage and cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  )
}
