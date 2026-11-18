import { Link } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, Code2, Smartphone, Palette,
  Cloud, TrendingUp, Shield, Star, Users, Award, Zap
} from 'lucide-react'
import SectionHeading from '../../components/common/SectionHeading'
import { SkeletonGrid, ErrorState, EmptyState } from '../../components/common/StateComponents'
import { useServices } from '../../hooks/useServices'
import { useProjects } from '../../hooks/useProjects'

/* ── Static WHY-US data ── */
const WHY_US = [
  { icon: Shield,     title: 'Security First',      desc: 'Every solution we build is designed with security at its core — not bolted on later.' },
  { icon: Zap,        title: 'Fast Delivery',        desc: 'Agile processes and experienced teams mean we deliver without compromising quality.' },
  { icon: TrendingUp, title: 'Scalable by Design',  desc: 'Architecture that grows with your business — from startup to enterprise scale.' },
  { icon: Users,      title: 'Dedicated Support',   desc: "12-month post-launch support included. We're partners, not just vendors." },
  { icon: Star,       title: 'Proven Track Record', desc: '100+ projects delivered across fintech, healthcare, e-commerce, and logistics.' },
  { icon: Award,      title: 'Award-Winning Team',  desc: 'Our engineers and designers have won recognition from Google, AWS and GitHub.' },
]

const STATS = [
  { value: '100+', label: 'Projects Delivered' },
  { value: '50+',  label: 'Happy Clients' },
  { value: '8+',   label: 'Years Experience' },
  { value: '99%',  label: 'Client Retention' },
]

/* Icon map for service icons stored as lucide name strings */
const ICON_MAP = { code: Code2, smartphone: Smartphone, layout: Palette, cloud: Cloud }

export default function HomePage() {
  const { services, loading: svcLoading, error: svcError } = useServices()
  const { projects, loading: prjLoading, error: prjError } = useProjects({ featuredOnly: true })

  return (
    <>
      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 min-h-[88vh] flex items-center">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* Gradient blob */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-accent-500/20 rounded-full blur-3xl" />

        <div className="section-container relative py-24 lg:py-32">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/80 font-medium">Now accepting new clients for 2026</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              We Build Digital Products{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-primary-300">
                That Matter
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 leading-relaxed mb-10 max-w-2xl">
              NexusCorp partners with ambitious companies to deliver web applications, mobile apps,
              and cloud infrastructure that drive measurable business results.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/contact" className="btn-primary text-base px-7 py-3.5 shadow-lg shadow-primary-900/40">
                Start a Project <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-base font-medium border border-white/20 text-white hover:bg-white/10 transition-colors"
              >
                View Our Work
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-12 flex flex-wrap gap-5">
              {['React & Next.js', 'Node.js & Python', 'AWS & GCP', 'PostgreSQL'].map(tech => (
                <div key={tech} className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {tech}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          STATS BAR
      ════════════════════════════════════════ */}
      <section className="bg-primary-600">
        <div className="section-container py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-white">
                <div className="text-3xl sm:text-4xl font-bold">{value}</div>
                <div className="text-sm text-primary-200 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SERVICES OVERVIEW
      ════════════════════════════════════════ */}
      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="section-container">
          <SectionHeading
            tag="What We Do"
            title="Services Built for Modern Businesses"
            subtitle="From ideation to deployment, we cover the full technology stack so you can focus on building your business."
          />

          {svcLoading && <SkeletonGrid count={4} cols={4} />}
          {svcError   && <ErrorState message={svcError} />}
          {!svcLoading && !svcError && services.length === 0 && (
            <EmptyState title="Services coming soon" />
          )}

          {!svcLoading && !svcError && services.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((svc) => {
                const Icon = ICON_MAP[svc.icon] ?? Code2
                return (
                  <div
                    key={svc.id}
                    className="card p-6 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{svc.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                      {svc.short_desc || svc.description}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          <div className="text-center mt-10">
            <Link to="/services" className="btn-secondary">
              View All Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED PROJECTS
      ════════════════════════════════════════ */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="section-container">
          <SectionHeading
            tag="Our Work"
            title="Featured Projects"
            subtitle="A selection of work we're proud to have delivered for our clients."
          />

          {prjLoading && <SkeletonGrid count={3} cols={3} />}
          {prjError   && <ErrorState message={prjError} />}
          {!prjLoading && !prjError && projects.length === 0 && (
            <EmptyState title="No featured projects yet" message="Check back soon — great things are coming." />
          )}

          {!prjLoading && !prjError && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.slice(0, 3).map((prj) => (
                <article key={prj.id} className="card group overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  {/* Image / fallback */}
                  <div className="relative h-48 bg-gradient-to-br from-primary-50 to-primary-100 overflow-hidden">
                    {prj.image_url ? (
                      <img
                        src={prj.image_url}
                        alt={prj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Zap className="w-10 h-10 text-primary-300" />
                      </div>
                    )}
                    {prj.category && (
                      <span className="absolute top-3 left-3 badge-blue text-xs">{prj.category}</span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{prj.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                      {prj.short_desc || prj.description}
                    </p>
                    {prj.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {prj.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="badge-gray text-xs">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link to="/projects" className="btn-secondary">
              View All Projects <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          WHY CHOOSE US
      ════════════════════════════════════════ */}
      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="section-container">
          <SectionHeading
            tag="Why NexusCorp"
            title="The Partner You Can Trust"
            subtitle="We don't just write code — we take ownership of outcomes and work as an extension of your team."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_US.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-6 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA BANNER
      ════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="section-container text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Build Something Great?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Let's talk about your project. We'll respond within one business day.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-semibold rounded-lg hover:bg-primary-50 transition-colors shadow-lg"
            >
              Get a Free Consultation <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              See Our Portfolio
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
