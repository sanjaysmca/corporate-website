import { Target, Eye, Heart, Lightbulb, Users, Globe, CheckCircle2 } from 'lucide-react'
import SectionHeading from '../../components/common/SectionHeading'
import { Link } from 'react-router-dom'

const VALUES = [
  { icon: Heart,      title: 'Integrity',       desc: 'We are transparent, honest and accountable in everything we do — with clients and with each other.' },
  { icon: Lightbulb,  title: 'Innovation',      desc: 'We stay at the leading edge of technology and continually improve how we build and deliver software.' },
  { icon: Users,      title: 'Collaboration',   desc: 'The best results come from open partnerships. We work alongside our clients, not just for them.' },
  { icon: Globe,      title: 'Impact',          desc: 'We care about the broader impact of the technology we build on users, society and the environment.' },
]

const TEAM = [
  { name: 'Priya Sharma',   role: 'CEO & Co-Founder',       initials: 'PS', color: 'bg-primary-100 text-primary-700' },
  { name: 'Rahul Verma',    role: 'CTO & Co-Founder',       initials: 'RV', color: 'bg-accent-500/10 text-accent-600' },
  { name: 'Anjali Nair',    role: 'Head of Design',         initials: 'AN', color: 'bg-green-100 text-green-700' },
  { name: 'Karan Mehta',    role: 'Lead Engineer',          initials: 'KM', color: 'bg-orange-100 text-orange-700' },
  { name: 'Deepa Iyer',     role: 'Product Manager',        initials: 'DI', color: 'bg-pink-100 text-pink-700' },
  { name: 'Siddharth Roy',  role: 'DevOps & Cloud Lead',    initials: 'SR', color: 'bg-cyan-100 text-cyan-700' },
]

const MILESTONES = [
  { year: '2016', event: 'Founded in Bangalore with a 4-person team.' },
  { year: '2018', event: 'Reached 25 clients and expanded to mobile development.' },
  { year: '2020', event: 'Launched our Cloud & DevOps practice during the remote work surge.' },
  { year: '2022', event: 'Grew to a 40-person team across 3 cities.' },
  { year: '2024', event: 'Surpassed 100 projects delivered across 10 countries.' },
]

export default function AboutPage() {
  return (
    <>
      {/* ── Page hero ── */}
      <section className="bg-gradient-to-br from-gray-900 to-primary-900 py-20 lg:py-28">
        <div className="section-container text-center">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-300 mb-4">
            Who We Are
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            Building the Future,<br />One Line at a Time
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            NexusCorp is a full-stack technology company founded in 2016. We build
            digital products for companies that want to grow fast and build right.
          </p>
        </div>
      </section>

      {/* ── Company overview ── */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Text */}
            <div>
              <span className="text-xs font-semibold tracking-widest uppercase text-primary-600 mb-3 block">Our Story</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 leading-tight">
                A Decade of Craft and Commitment
              </h2>
              <p className="text-gray-500 leading-relaxed mb-5">
                NexusCorp was founded in 2016 by Priya Sharma and Rahul Verma, two engineers
                who believed that great software comes from deep collaboration between technologists
                and business thinkers. What started as a 4-person consultancy in Bangalore has grown
                into a 50-person engineering company delivering solutions for clients across India,
                the UK, and the US.
              </p>
              <p className="text-gray-500 leading-relaxed mb-8">
                We work across industries including fintech, healthcare, logistics, and e-commerce.
                Our edge is not just technical expertise — it's how we listen, adapt and take
                genuine ownership of your outcomes.
              </p>
              <ul className="space-y-3">
                {['50+ in-house engineers', '100+ projects shipped', '10+ countries served', '12-month post-launch support'].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <span className="text-gray-700 text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Timeline */}
            <div className="relative pl-6 border-l-2 border-primary-100">
              {MILESTONES.map(({ year, event }) => (
                <div key={year} className="mb-8 last:mb-0 relative">
                  <div className="absolute -left-[29px] top-0 w-4 h-4 rounded-full bg-primary-600 border-2 border-white shadow" />
                  <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">{year}</span>
                  <p className="text-sm text-gray-600 mt-1">{event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="section-container">
          <SectionHeading tag="Purpose" title="Mission & Vision" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-5">
                <Target className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h3>
              <p className="text-gray-500 leading-relaxed">
                To help ambitious organisations build technology that is reliable, secure, and
                genuinely useful — delivered with clarity, integrity, and a bias toward action.
              </p>
            </div>
            <div className="card p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center mb-5">
                <Eye className="w-6 h-6 text-accent-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Our Vision</h3>
              <p className="text-gray-500 leading-relaxed">
                A world where every company — regardless of size — has access to world-class
                engineering talent and can build digital products that compete at a global level.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="section-container">
          <SectionHeading
            tag="What We Stand For"
            title="Our Core Values"
            subtitle="These four principles guide every decision we make — from how we write code to how we treat our clients."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 text-center hover:shadow-md transition-shadow group">
                <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-100 transition-colors">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="section-container">
          <SectionHeading
            tag="The People"
            title="Meet the Team"
            subtitle="A group of designers, engineers and product thinkers united by a shared obsession with building great software."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEAM.map(({ name, role, initials, color }) => (
              <div key={name} className="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${color}`}>
                  {initials}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{name}</h3>
                  <p className="text-sm text-gray-500">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-primary-600">
        <div className="section-container text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Want to Work with Us?</h2>
          <p className="text-primary-100 mb-7">We're always looking for the right next project — and the right next teammate.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact" className="inline-flex items-center gap-2 px-7 py-3 bg-white text-primary-700 font-semibold rounded-lg hover:bg-primary-50 transition-colors">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
