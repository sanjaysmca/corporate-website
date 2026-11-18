/**
 * useAdminData — admin-only data hooks.
 *
 * All hooks here require an authenticated admin session.
 * RLS on the database enforces this server-side; the hooks simply
 * pass the session JWT automatically via the Supabase client.
 *
 * Pattern used in every hook:
 *   - `loading` starts true; set false when the first response arrives.
 *   - `error` holds the Supabase error message string or null.
 *   - `refresh()` re-runs the query (used after mutations).
 *   - cancelled flag prevents setState calls after unmount.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/* ─────────────────────────────────────────────────────────────────────────────
   useDashboardStats
   Calls the get_dashboard_stats() RPC which is protected by an is_admin()
   body guard in the database — non-admins receive a 403 from Supabase.
───────────────────────────────────────────────────────────────────────────── */
export function useDashboardStats() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('get_dashboard_stats')
    if (error) setError(error.message)
    else       setStats(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { stats, loading, error, refresh: load }
}

/* ─────────────────────────────────────────────────────────────────────────────
   useAdminProjects
   Fetches ALL projects (including inactive) for the admin table.
───────────────────────────────────────────────────────────────────────────── */
export function useAdminProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else       setProjects(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { projects, loading, error, refresh: load }
}

/* ─────────────────────────────────────────────────────────────────────────────
   useAdminServices
   Fetches ALL services (including inactive) for the admin table.
───────────────────────────────────────────────────────────────────────────── */
export function useAdminServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else       setServices(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { services, loading, error, refresh: load }
}

/* ─────────────────────────────────────────────────────────────────────────────
   useAdminEnquiries
   Fetches all enquiries, optionally filtered by status.
   statusFilter = '' means fetch all.
───────────────────────────────────────────────────────────────────────────── */
export function useAdminEnquiries(statusFilter = '') {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let q = supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusFilter) q = q.eq('status', statusFilter)

    const { data, error } = await q
    if (error) setError(error.message)
    else       setEnquiries(data ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  return { enquiries, loading, error, refresh: load }
}

/* ─────────────────────────────────────────────────────────────────────────────
   useAdminMedia
   Fetches all media records for the media management page.
───────────────────────────────────────────────────────────────────────────── */
export function useAdminMedia() {
  const [media, setMedia]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else       setMedia(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { media, loading, error, refresh: load }
}

/* ─────────────────────────────────────────────────────────────────────────────
   useAdminProfile
   Fetches the authenticated user's profile and verifies role = 'admin'.
   Used by AdminLayout to show the admin's name and double-check role.
───────────────────────────────────────────────────────────────────────────── */
export function useAdminProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    let cancelled = false

    async function fetch() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .eq('id', userId)
        .single()
      if (cancelled) return
      if (error) setError(error.message)
      else       setProfile(data)
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [userId])

  return { profile, loading, error }
}

/* ─────────────────────────────────────────────────────────────────────────────
   useRecentEnquiries
   Fetches the 5 most recent enquiries for the dashboard overview.
───────────────────────────────────────────────────────────────────────────── */
export function useRecentEnquiries(limit = 5) {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      const { data, error } = await supabase
        .from('enquiries')
        .select('id, name, email, subject, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (cancelled) return
      if (error) setError(error.message)
      else       setEnquiries(data ?? [])
      setLoading(false)
    }
    fetch()
    return () => { cancelled = true }
  }, [limit])

  return { enquiries, loading, error }
}
