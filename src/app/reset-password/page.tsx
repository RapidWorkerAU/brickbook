'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@/components/action-buttons'
import { IconEye, IconEyeOff, IconCircleCheck } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: form.password })
      if (error) throw error
      void fetch('/api/account/password-changed', { method: 'POST' })
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const strength = (p: string) => {
    if (!p) return null
    if (p.length < 6) return { label: 'Too short', className: 'password-strength-danger', widthClass: 'w-[20%]' }
    if (p.length < 8) return { label: 'Weak', className: 'password-strength-warning', widthClass: 'w-[40%]' }
    if (p.length < 12 && /[0-9]/.test(p)) return { label: 'Good', className: 'password-strength-warning', widthClass: 'w-[65%]' }
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return { label: 'Strong', className: 'password-strength-success', widthClass: 'w-full' }
    return { label: 'Fair', className: 'password-strength-warning', widthClass: 'w-1/2' }
  }

  const passwordStrength = strength(form.password)

  return (
    <div className="auth-page">
      <div className="bg-white border-b border-stone-200 h-[52px] flex items-center px-6">
        <Link href="/" className="text-[12px] font-bold tracking-[0.14em] uppercase text-bb-black">
          Brickbook
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">

          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-bb-green-light flex items-center justify-center mx-auto mb-4">
                <IconCircleCheck size={24} className="text-bb-green" />
              </div>
              <h1 className="text-[20px] font-semibold text-bb-black mb-2">Password updated</h1>
              <p className="text-[13px] text-stone-600">Redirecting you to your dashboard...</p>
            </div>
          ) : (
            <>
              <h1 className="text-[22px] font-semibold text-bb-black mb-1">Set a new password</h1>
              <p className="text-[13px] text-stone-600 mb-6">
                Choose a strong password for your Brickbook account.
              </p>

              {error && (
                <div className="alert alert-error mb-4">
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                  <label className="form-label">New password *</label>
                  <div className="relative">
                    <input
                      className="form-input pr-10"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={set('password')}
                      required
                      autoComplete="new-password"
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
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`password-strength-bar ${passwordStrength.widthClass} ${passwordStrength.className}`} />
                      </div>
                      <p className={`text-[11px] mt-1 ${passwordStrength.className}`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm new password *</label>
                  <input
                    className={`form-input ${
                      form.confirmPassword && form.confirmPassword !== form.password
                        ? 'form-input-error'
                        : form.confirmPassword && form.confirmPassword === form.password
                        ? 'form-input-success'
                        : ''
                    }`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    required
                    autoComplete="new-password"
                  />
                  {form.confirmPassword && form.confirmPassword !== form.password && (
                    <p className="form-error">Passwords do not match.</p>
                  )}
                </div>

                <LoadingButton
                  type="submit"
                  className="btn btn-primary w-full justify-center"
                  loading={loading}
                >
                  Update password
                </LoadingButton>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

