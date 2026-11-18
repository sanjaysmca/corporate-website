/**
 * SectionHeading — consistent section title + subtitle across all pages.
 * @param {string}  tag      — overline label (e.g. "Our Services")
 * @param {string}  title    — main heading
 * @param {string}  subtitle — supporting paragraph
 * @param {string}  align    — 'center' | 'left' (default: 'center')
 */
export default function SectionHeading({ tag, title, subtitle, align = 'center' }) {
  const isCenter = align === 'center'
  return (
    <div className={`mb-12 ${isCenter ? 'text-center max-w-2xl mx-auto' : ''}`}>
      {tag && (
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-600 mb-3">
          {tag}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base sm:text-lg text-gray-500 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
