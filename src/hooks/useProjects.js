import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useProjects — fetches active projects from Supabase.
 * @param {Object} options
 * @param {boolean} [options.featuredOnly] — if true, only returns featured projects
 */
export function useProjects({ featuredOnly = false } = {}) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('projects')
        .select('id, title, slug, description, short_desc, client_name, category, tags, image_url, is_featured, completed_at, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (featuredOnly) {
        query = query.eq('is_featured', true)
      }

      const { data, error } = await query

      if (cancelled) return
      if (error) setError(error.message)
      else       setProjects(data ?? [])
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [featuredOnly])

  return { projects, loading, error }
}
