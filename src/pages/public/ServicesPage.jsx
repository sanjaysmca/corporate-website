import { Link } from 'react-router-dom'
import { ArrowRight, Code2, Smartphone, Palette, Cloud, Briefcase, RefreshCw } from 'lucide-react'
import SectionHeading from '../../components/common/SectionHeading'
import { LoadingSpinner, ErrorState, EmptyState } from '../../components/common/StateComponents'
import { useServices } from '../../hooks/useServices'

const ICON_MAP = {
  code:        Code2,
  smartphone:  Smartphone,
  layout:      Palette,
  cloud:       Cloud,
  briefcase:   Briefcase,
  'refresh-cw': RefreshCw,
}

const PROCESS = [
  { step: '01', title: 'Discovery',    desc: 'We learn your business, goals and constraints before writing a line of code.' },
  { step: '02', title: 'Planning',     desc: 'Architecture decisions, timelines and milestones agreed upfront — no surprises.' },
  { step: '03', title: 'Development',  desc: 'Iterative sprints with regular demos so you see progress weekly.' },
  { step: '04', title: 'Launch',       desc: 'Staged deployment with thorough testing. We stay on call post-launch.' },
]

export default function ServicesPage() {
  const { services, loading, error } = useServices()

  return (
    <>
      {/* ── Page hero ── */}
      <section className="bg-gradient-to-br from-gray-900 to-primary-900 py-20 lg:py-28">
        <div className="section-container text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary-100 mb-4 block">
            What We Offer
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            Services That Drive Results
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            From discovery to deployment, we provide end-to-end technology services
            tailored to your business goals and growth stage.
          </p>
        </div>
      </section>

      {/* ── Services grid ── */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="section-container">
          <SectionHeading
            tag="Our Services"
            title="Everything You Need Under One Roof"
            subtitle="We offer a comprehensive range of technology services — no need to juggle multiple vendors."
          />

          {loading && <LoadingSpinner message="Loading services…" />}
          {error   && <ErrorState message={error} />}
          {!loading && !error && services.length === 0 && (
            <EmptyState
              title="No services listed yet"
              message="Check back soon. Our services listing is being updated."
            />
          )}

          {!loading && !error && services.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((svc) => {
                const Icon = ICON_MAP[svc.icon] ?? Code2
                return (
                  <div
                    key={svc.id}
                    className="card overflow-hidden group hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image or colour panel */}
                      {svc.image_url ? (
                        <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0 overflow-hidden">
                          <img
                            src={svc.image_url}
                            alt={svc.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                          <Icon className="w-10 h-10 text-primary-400" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-6 flex flex-col justify-center">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-3">
                          <Icon className="w-5 h-5 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{svc.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {svc.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Our Process ── */}
      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="section-container">
          <SectionHeading
            tag="How We Work"
            title="Our Development Process"
            subtitle="A proven approach that keeps projects on track and stakeholders aligned at every step."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS.map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="card p-6 h-full hover:shadow-md transition-shadow">
                  <span className="text-4xl font-black text-primary-100 block mb-3">{step}</span>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-primary-600">
        <div className="section-container text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Not Sure Where to Start?</h2>
          <p className="text-primary-100 mb-7 max-w-lg mx-auto">
            Book a free 30-minute discovery call. We'll listen, ask the right questions,
            and recommend the best path forward — no commitment required.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-primary-700 font-semibold rounded-lg hover:bg-primary-50 transition-colors shadow-lg"
          >
            Book a Free Call <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
