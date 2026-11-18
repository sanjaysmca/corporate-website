import { Link } from 'react-router-dom'
import { Zap, Mail, Phone, MapPin, ExternalLink } from 'lucide-react'

const SERVICES_LINKS = ['Web Development', 'Mobile Applications', 'UI/UX Design', 'Cloud & DevOps', 'Digital Consulting']
const COMPANY_LINKS  = [
  { label: 'About Us',  to: '/about' },
  { label: 'Services',  to: '/services' },
  { label: 'Projects',  to: '/projects' },
  { label: 'Contact',   to: '/contact' },
]

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* ── Main footer grid ── */}
      <div className="section-container py-14 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-4 no-underline">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold text-white">
                Nexus<span className="text-primary-400">Corp</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              Building digital products that matter. We partner with ambitious companies
              to deliver technology that drives real business results.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3 mt-5">
              {[
                { label: 'LinkedIn', href: '#' },
                { label: 'Twitter',  href: '#' },
                { label: 'GitHub',   href: '#' },
              ].map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors text-gray-400 hover:text-white text-xs font-bold"
                >
                  {label.slice(0, 2)}
                </a>
              ))}
            </div>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-gray-400 hover:text-white transition-colors no-underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services list */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Services</h4>
            <ul className="space-y-2.5">
              {SERVICES_LINKS.map(s => (
                <li key={s}>
                  <Link
                    to="/services"
                    className="text-sm text-gray-400 hover:text-white transition-colors no-underline"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-400">
                  42 Innovation Drive, Tech Park,<br />Bangalore 560103, India
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <a href="tel:+919876543210" className="text-sm text-gray-400 hover:text-white transition-colors no-underline">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <a href="mailto:hello@nexuscorp.in" className="text-sm text-gray-400 hover:text-white transition-colors no-underline">
                  hello@nexuscorp.in
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-gray-800">
        <div className="section-container py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} NexusCorp. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors no-underline">Privacy Policy</a>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors no-underline">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
