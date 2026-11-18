/**
 * LoginPage — /admin/login
 *
 * - Email + password form using react-hook-form + zod.
 * - Calls useAuth().signIn() (which calls supabase.auth.signInWithPassword).
 * - On success: navigates to /admin (or to state.from if set by ProtectedRoute).
 * - If the user is already authenticated, redirects to /admin immediately.
 * - Shows clear error messages for wrong credentials.
 * - Never exposes any service-role key or backend secret.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Zap, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/* ── Validation schema ──────────────────────────────────────────────────── */
const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function LoginPage() {
  const { signIn, isAuthenticated, loading: authLoading } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname ?? '/admin'

  const [showPassword, setShowPassword] = useState(false)
  const [serverError,  setServerError]  = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  /* Redirect if already logged in */
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate, from])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit({ email, password }) {
    setSubmitting(true)
    setServerError('')

    const { error } = await signIn(email.trim().toLowerCase(), password)

    if (error) {
      /* Map Supabase error codes to friendly messages */
      if (
        error.message?.includes('Invalid login credentials') ||
        error.message?.includes('invalid_credentials')
      ) {
        setServerError('Incorrect email or password. Please try again.')
      } else if (error.message?.includes('Email not confirmed')) {
        setServerError('Please confirm your email address before logging in.')
      } else {
        setServerError(error.message ?? 'Login failed. Please try again.')
      }
      setSubmitting(false)
    }
    /* On success, AuthContext updates → useEffect above fires → navigate */
  }

  /* While session is resolving, show nothing to prevent flash */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4 shadow-lg">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-1">NexusCorp — Authorised access only</p>
        </div>

        {/* Login card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          {/* Server error banner */}
          {serverError && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                className={`input ${errors.email ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`input pr-10 ${errors.password ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <p className="mt-6 text-xs text-gray-400 text-center leading-relaxed">
            This portal is for authorised administrators only.
            Accounts are managed by the system administrator — no self-registration is available.
          </p>
        </div>

        {/* Back to website */}
        <p className="mt-6 text-center text-sm">
          <a href="/" className="text-gray-500 hover:text-primary-600 transition-colors">
            ← Back to public website
          </a>
        </p>
      </div>
    </div>
  )
}
