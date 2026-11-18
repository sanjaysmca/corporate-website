import { useState, useMemo } from 'react'
import { Calendar, Tag, Zap } from 'lucide-react'
import { format } from 'date-fns'
import SectionHeading from '../../components/common/SectionHeading'
import { LoadingSpinner, ErrorState, EmptyState } from '../../components/common/StateComponents'
import { useProjects } from '../../hooks/useProjects'
import { Link } from 'react-router-dom'

const ALL = 'All'

export default function ProjectsPage() {
  const { projects, loading, error } = useProjects()
  const [activeCategory, setActiveCategory] = useState(ALL)

  /* Derive unique category list from live data */
  const categories = useMemo(() => {
    const cats = projects.map(p => p.category).filter(Boolean)
    return [ALL, ...Array.from(new Set(cats))]
  }, [projects])

  const filtered = useMemo(() =>
    activeCategory === ALL
      ? projects
      : projects.filter(p => p.category === activeCategory),
  [projects, activeCategory])

  return (
    <>
      {/* ── Page hero ── */}
      <section className="bg-gradient-to-br from-gray-900 to-primary-900 py-20 lg:py-28">
        <div className="section-container text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary-300 mb-4 block">
            Our Portfolio
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            Work We're Proud Of
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Browse our portfolio of real projects delivered for real clients — across
            fintech, healthcare, e-commerce and beyond.
          </p>
        </div>
      </section>

      {/* ── Projects grid ── */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="section-container">
          <SectionHeading
            tag="Projects"
            title="Case Studies & Deliveries"
          />

          {loading && <LoadingSpinner message="Loading projects…" />}
          {error   && <ErrorState message={error} />}

          {!loading && !error && (
            <>
              {/* Category filter bar */}
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center mb-10" role="group" aria-label="Filter by category">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                        activeCategory === cat
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {filtered.length === 0 ? (
                <EmptyState
                  title="No projects in this category"
                  message="Try selecting a different category filter."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                  {filtered.map(prj => (
                    <article
                      key={prj.id}
                      className="card group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    >
                      {/* Image / placeholder */}
                      <div className="relative h-52 bg-gradient-to-br from-primary-50 to-primary-100 overflow-hidden">
                        {prj.image_url ? (
                          <img
                            src={prj.image_url}
                            alt={prj.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Zap className="w-10 h-10 text-primary-200" />
                          </div>
                        )}
                        {prj.category && (
                          <span className="absolute top-3 left-3 badge-blue">{prj.category}</span>
                        )}
                        {prj.is_featured && (
                          <span className="absolute top-3 right-3 badge-yellow">Featured</span>
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-5">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base">
                          {prj.title}
                        </h3>

                        {prj.client_name && (
                          <p className="text-xs text-gray-400 mb-2">
                            Client: <span className="font-medium text-gray-600">{prj.client_name}</span>
                          </p>
                        )}

                        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                          {prj.short_desc || prj.description}
                        </p>

                        {/* Tags */}
                        {prj.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <Tag className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            {prj.tags.slice(0, 4).map(tag => (
                              <span key={tag} className="badge-gray">{tag}</span>
                            ))}
                          </div>
                        )}

                        {/* Completed date */}
                        {prj.completed_at && (
                          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            Completed {format(new Date(prj.completed_at), 'MMM yyyy')}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="section-container text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Have a Project in Mind?</h2>
          <p className="text-gray-500 mb-7">Let's discuss your requirements and how we can help.</p>
          <Link to="/contact" className="btn-primary px-8 py-3.5 text-base">
            Start a Conversation
          </Link>
        </div>
      </section>
    </>
  )
}
