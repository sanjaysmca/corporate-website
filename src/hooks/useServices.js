import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useServices — fetches active services from Supabase.
 * Public RLS policy ensures only is_active = TRUE rows are returned
 * for anonymous callers — no extra filter needed here, but we add one
 * as a belt-and-suspenders guard.
 */
export function useServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('services')
        .select('id, title, slug, description, short_desc, icon, image_url, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (cancelled) return
      if (error) setError(error.message)
      else       setServices(data ?? [])
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [])

  return { services, loading, error }
}
