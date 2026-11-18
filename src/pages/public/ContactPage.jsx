import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/* ── Zod schema — mirrors DB CHECK constraints ── */
const enquirySchema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email:   z.string().email('Please enter a valid email address'),
  phone:   z.string().max(20, 'Phone number is too long').optional().or(z.literal('')),
  subject: z.string().max(200, 'Subject is too long').optional().or(z.literal('')),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message is too long'),
})

const CONTACT_INFO = [
  {
    icon: MapPin,
    label: 'Address',
    lines: ['42 Innovation Drive, Tech Park,', 'Bangalore 560103, India'],
  },
  {
    icon: Phone,
    label: 'Phone',
    lines: ['+91 98765 43210'],
    href: 'tel:+919876543210',
  },
  {
    icon: Mail,
    label: 'Email',
    lines: ['hello@nexuscorp.in'],
    href: 'mailto:hello@nexuscorp.in',
  },
  {
    icon: Clock,
    label: 'Business Hours',
    lines: ['Monday – Friday: 9 AM – 7 PM IST', 'Saturday: 10 AM – 2 PM IST'],
  },
]

export default function ContactPage() {
  const [submitState, setSubmitState] = useState('idle') // idle | loading | success | error
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(enquirySchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  })

  async function onSubmit(data) {
    setSubmitState('loading')
    setServerError('')

    // Strip empty optional fields so DB receives NULL (not empty string)
    const payload = {
      name:    data.name.trim(),
      email:   data.email.trim().toLowerCase(),
      message: data.message.trim(),
      ...(data.phone?.trim()   ? { phone:   data.phone.trim() }   : {}),
      ...(data.subject?.trim() ? { subject: data.subject.trim() } : {}),
    }

    const { error } = await supabase.from('enquiries').insert([payload])

    if (error) {
      // Map Supabase error codes to user-friendly messages
      let msg = 'Failed to send your message. Please try again.'
      if (error.code === '23514') msg = 'Your submission contains invalid data. Please check the form and try again.'
      setServerError(msg)
      setSubmitState('error')
    } else {
      setSubmitState('success')
      reset()
    }
  }

  return (
    <>
      {/* ── Page hero ── */}
      <section className="bg-gradient-to-br from-gray-900 to-primary-900 py-20 lg:py-28">
        <div className="section-container text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary-300 mb-4 block">
            Get in Touch
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            Let's Talk About Your Project
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Fill in the form below or reach us directly. We respond to every enquiry
            within one business day.
          </p>
        </div>
      </section>

      {/* ── Contact content ── */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

            {/* ── Contact information ── */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We're a team of real people — reach out and we'll get back to you personally.
                </p>
              </div>

              {CONTACT_INFO.map(({ icon: Icon, label, lines, href }) => (
                <div key={label} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                    {lines.map((line, i) =>
                      href && i === 0 ? (
                        <a key={i} href={href} className="block text-sm text-gray-700 hover:text-primary-600 transition-colors no-underline font-medium">
                          {line}
                        </a>
                      ) : (
                        <p key={i} className="text-sm text-gray-600">{line}</p>
                      )
                    )}
                  </div>
                </div>
              ))}

              {/* Map placeholder */}
              <div className="mt-6 rounded-xl overflow-hidden border border-gray-100 h-52 bg-gray-100 flex items-center justify-center">
                <span className="text-sm text-gray-400">Map Embed (Google Maps)</span>
              </div>
            </div>

            {/* ── Enquiry form ── */}
            <div className="lg:col-span-3">
              <div className="card p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Send Us a Message</h2>

                {/* Success state */}
                {submitState === 'success' && (
                  <div className="rounded-xl bg-green-50 border border-green-200 p-6 flex gap-4 mb-6 animate-slide-up">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-green-800 mb-1">Message sent successfully!</h3>
                      <p className="text-sm text-green-700">
                        Thank you for reaching out. We'll get back to you within one business day.
                      </p>
                      <button
                        onClick={() => setSubmitState('idle')}
                        className="mt-3 text-sm font-medium text-green-700 underline hover:text-green-900"
                      >
                        Send another message
                      </button>
                    </div>
                  </div>
                )}

                {/* Server-level error banner */}
                {submitState === 'error' && serverError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3 mb-6">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{serverError}</p>
                  </div>
                )}

                {submitState !== 'success' && (
                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                    {/* Name + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="label" htmlFor="name">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Jane Smith"
                          className={`input ${errors.name ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                          {...register('name')}
                        />
                        {errors.name && <p className="field-error">{errors.name.message}</p>}
                      </div>
                      <div>
                        <label className="label" htmlFor="email">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="jane@company.com"
                          className={`input ${errors.email ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                          {...register('email')}
                        />
                        {errors.email && <p className="field-error">{errors.email.message}</p>}
                      </div>
                    </div>

                    {/* Phone + Subject */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="label" htmlFor="phone">Phone Number</label>
                        <input
                          id="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="+91 98765 43210"
                          className={`input ${errors.phone ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                          {...register('phone')}
                        />
                        {errors.phone && <p className="field-error">{errors.phone.message}</p>}
                      </div>
                      <div>
                        <label className="label" htmlFor="subject">Subject</label>
                        <input
                          id="subject"
                          type="text"
                          placeholder="Project enquiry"
                          className={`input ${errors.subject ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                          {...register('subject')}
                        />
                        {errors.subject && <p className="field-error">{errors.subject.message}</p>}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="label" htmlFor="message">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="message"
                        rows={6}
                        placeholder="Tell us about your project, timeline and budget…"
                        className={`input resize-y min-h-[120px] ${errors.message ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                        {...register('message')}
                      />
                      {errors.message && <p className="field-error">{errors.message.message}</p>}
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting || submitState === 'loading'}
                      className="btn-primary w-full py-3 text-base"
                    >
                      {(isSubmitting || submitState === 'loading') ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </button>

                    <p className="text-xs text-gray-400 text-center">
                      We respect your privacy. Your information will not be shared with third parties.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
