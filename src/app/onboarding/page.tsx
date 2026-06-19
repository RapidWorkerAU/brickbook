'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@/components/action-buttons'
import { IconCamera, IconCheck } from '@tabler/icons-react'
import { saveOnboardingProfile } from './actions'
import { createClient } from '@/lib/supabase/client'

const STEPS = ['Username', 'Display name', 'Avatar']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  const [form, setForm] = useState({
    username: '',
    displayName: '',
    avatarPreview: '',
    avatarFile: null as File | null,
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (k === 'username') setUsernameStatus('idle')
  }

  const checkUsername = async () => {
    if (!form.username || form.username.length < 3) return
    setUsernameStatus('checking')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', form.username.trim().toLowerCase())
      .maybeSingle()

    if (error) {
      setUsernameStatus('idle')
      setError(error.message)
      return
    }

    setUsernameStatus(data ? 'taken' : 'available')
  }

  const handleNext = async () => {
    setError('')
    if (step === 0) {
      if (!form.username || form.username.length < 3) {
        setError('Username must be at least 3 characters.')
        return
      }
      if (usernameStatus === 'taken') {
        setError('That username is taken. Please choose another.')
        return
      }
    }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      handleFinish()
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.set('username', form.username)
      formData.set('display_name', form.displayName)
      if (form.avatarFile) {
        formData.set('avatar_file', form.avatarFile)
      }

      const result = await saveOnboardingProfile(formData)
      if (result.error) {
        setError(result.error)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const initials = (form.displayName || form.username || '?').charAt(0).toUpperCase()

  return (
    <div className="auth-page">
      <div className="bg-white border-b border-stone-200 h-[52px] flex items-center px-6">
        <span className="text-[12px] font-bold tracking-[0.14em] uppercase text-bb-black">Brickbook</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${
                  i < step
                    ? 'bg-bb-black text-white'
                    : i === step
                    ? 'bg-bb-amber text-white'
                    : 'bg-stone-200 text-stone-400'
                }`}>
                  {i < step ? <IconCheck size={12} /> : i + 1}
                </div>
                <span className={`text-[11px] font-medium ${i === step ? 'text-bb-black' : 'text-stone-400'}`}>
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${i < step ? 'bg-bb-black' : 'bg-stone-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="animate-fade-in">

            {step === 0 && (
              <>
                <h1 className="text-[22px] font-semibold text-bb-black mb-1">Choose your username</h1>
                <p className="text-[13px] text-stone-600 mb-6">
                  This is your public handle on Brickbook. You can change it later.
                </p>

                {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-stone-400">@</span>
                    <input
                      className={`form-input pl-7 ${
                        usernameStatus === 'taken' ? 'form-input-error' :
                        usernameStatus === 'available' ? 'form-input-success' : ''
                      }`}
                      type="text"
                      placeholder="leggy59"
                      value={form.username}
                      onChange={set('username')}
                      onBlur={checkUsername}
                      maxLength={30}
                      pattern="[a-zA-Z0-9_]+"
                    />
                  </div>
                  {usernameStatus === 'checking' && (
                    <p className="form-hint flex items-center gap-1"><div className="spinner spinner-sm" /> Checking...</p>
                  )}
                  {usernameStatus === 'available' && (
                    <p className="form-hint password-strength-success">
                      <IconCheck size={12} className="inline mr-1" />Username available
                    </p>
                  )}
                  {usernameStatus === 'taken' && (
                    <p className="form-error">That username is taken.</p>
                  )}
                  {usernameStatus === 'idle' && (
                    <p className="form-hint">Letters, numbers, and underscores only.</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label text-stone-400 text-[11px]">Your public build URL</label>
                  <div className="bg-stone-100 rounded-md px-3 py-2 text-[12px] text-stone-600 font-mono">
                    brickbook.com.au/{form.username || 'username'}
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-[22px] font-semibold text-bb-black mb-1">What should we call you?</h1>
                <p className="text-[13px] text-stone-600 mb-6">
                  Your display name appears on your profile and updates. It can be your name, nickname, or anything you like.
                </p>

                {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

                <div className="form-group">
                  <label className="form-label">Display name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. Lee & Beck"
                    value={form.displayName}
                    onChange={set('displayName')}
                    maxLength={50}
                  />
                  <p className="form-hint">Leave blank to use @{form.username}</p>
                </div>

                {/* Preview */}
                <div className="card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-3">Preview</p>
                  <div className="flex items-center gap-3">
                    <div className="avatar avatar-lg avatar-amber">{initials}</div>
                    <div>
                      <div className="text-[15px] font-semibold text-bb-black">
                        {form.displayName || form.username || 'Your name'}
                      </div>
                      <div className="text-[12px] text-stone-400">@{form.username}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-[22px] font-semibold text-bb-black mb-1">Add a profile photo</h1>
                <p className="text-[13px] text-stone-600 mb-6">
                  Optional but recommended. Helps people recognise you in the community.
                </p>

                {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

                <div className="flex flex-col items-center gap-4 mb-6">
                  {form.avatarPreview ? (
                    // Object URLs from local file previews should stay as native images.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.avatarPreview} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover border-2 border-stone-200" />
                  ) : (
                    <div className="avatar avatar-xl avatar-amber text-[28px]">{initials}</div>
                  )}
                  <label className="btn btn-secondary btn-sm cursor-pointer">
                    <IconCamera size={14} />
                    {form.avatarPreview ? 'Change photo' : 'Upload photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = URL.createObjectURL(file)
                          setForm(f => ({ ...f, avatarPreview: url, avatarFile: file }))
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="alert alert-info mb-2">
                  <span className="text-[12px]">You can always update your photo later from account settings.</span>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="btn btn-secondary flex-1 justify-center"
              >
                Back
              </button>
            )}
            <LoadingButton
              onClick={handleNext}
              className="btn btn-primary flex-1 justify-center"
              loading={loading}
            >
              {step === STEPS.length - 1 ? (
                'Go to my dashboard'
              ) : (
                'Continue'
              )}
            </LoadingButton>
          </div>

          {step === 2 && (
            <button
              onClick={handleFinish}
              className="btn btn-ghost w-full justify-center mt-2 text-stone-400"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

