'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LoadingButton } from '@/components/action-buttons'
import { IconArrowLeft, IconMailCheck } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="bg-white border-b border-stone-200 h-[52px] flex items-center px-6">
        <Link href="/" className="text-[12px] font-bold tracking-[0.14em] uppercase text-bb-black">
          Brickbook
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">

          <Link href="/get-started" className="inline-flex items-center gap-1.5 text-[12px] text-stone-400 hover:text-bb-black transition-colors mb-6">
            <IconArrowLeft size={14} /> Back to sign in
          </Link>

          {sent ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-bb-green-light flex items-center justify-center mx-auto mb-4">
                <IconMailCheck size={24} className="text-bb-green" />
              </div>
              <h1 className="text-[20px] font-semibold text-bb-black mb-2">Check your email</h1>
              <p className="text-[13px] text-stone-600 leading-relaxed mb-6">
                We&apos;ve sent a password reset link to <strong className="text-bb-black">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <p className="text-[11px] text-stone-400">
                Didn&apos;t receive it?{' '}
                <button onClick={() => setSent(false)} className="text-bb-amber hover:opacity-80">
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-[22px] font-semibold text-bb-black mb-1">Reset your password</h1>
              <p className="text-[13px] text-stone-600 mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="alert alert-error mb-4">
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Email address *</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <LoadingButton
                  type="submit"
                  className="btn btn-primary w-full justify-center"
                  loading={loading}
                >
                  Send reset link
                </LoadingButton>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

