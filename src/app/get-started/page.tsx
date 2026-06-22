'use client'

import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { LoadingButton } from '@/components/action-buttons'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'

function GetStartedForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login'
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (tab === 'signup' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        })

        if (error) throw error

        if (data.session) {
          router.push('/onboarding')
          return
        }

        setMessage('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })

        if (error) throw error
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t: 'login' | 'signup') => {
    setTab(t)
    setError('')
    router.replace(`/get-started?tab=${t}`, { scroll: false })
  }

  return (
    <div className="auth-page">

      {/* Simple top bar */}
      <div className="bg-white border-b border-stone-200 h-[52px] flex items-center px-6">
        <Link href="/" className="text-[12px] font-bold tracking-[0.14em] uppercase text-bb-black">
          Brickbook
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">

          {/* Tab switcher */}
          <div className="flex bg-white border border-stone-200 rounded-lg p-1 mb-6">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-all duration-150 ${
                tab === 'login'
                  ? 'bg-bb-black text-white'
                  : 'text-stone-600 hover:text-bb-black'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => switchTab('signup')}
              className={`flex-1 py-2 text-[13px] font-medium rounded-md transition-all duration-150 ${
                tab === 'signup'
                  ? 'bg-bb-black text-white'
                  : 'text-stone-600 hover:text-bb-black'
              }`}
            >
              Create account
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-[22px] font-semibold text-bb-black mb-1">
              {tab === 'login' ? 'Welcome back' : 'Start documenting your build'}
            </h1>
            <p className="text-[13px] text-stone-600">
              {tab === 'login'
                ? 'Sign in to view your feed and manage your builds.'
                : 'Free to join. Share your progress with the community.'}
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="alert alert-success mb-4">
              <span>{message}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="form-group">
              <label className="form-label">Email address *</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <div className="relative">
                <input
                  className="form-input pr-10"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={tab === 'signup' ? 'At least 8 characters' : '********'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={8}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {tab === 'login' && (
                <div className="mt-1 text-right">
                  <Link href="/forgot-password" className="text-[11px] text-bb-amber hover:opacity-80">
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            {tab === 'signup' && (
              <div className="form-group">
                <label className="form-label">Confirm password *</label>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            <LoadingButton
              type="submit"
              className="btn btn-primary w-full justify-center mt-2"
              loading={loading}
            >
              {tab === 'login' ? 'Sign in' : 'Create account'}
            </LoadingButton>

          </form>

          {/* Footer copy */}
          {tab === 'signup' && (
            <p className="text-[11px] text-stone-400 text-center mt-5 leading-relaxed">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="text-bb-amber hover:opacity-80">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-bb-amber hover:opacity-80">Privacy Policy</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GetStartedPage() {
  return (
    <Suspense>
      <GetStartedForm />
    </Suspense>
  )
}

