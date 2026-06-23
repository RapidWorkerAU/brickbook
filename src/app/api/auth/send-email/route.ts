import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { sendEmail } from '@/lib/email/send'

export const runtime = 'nodejs'

// Supabase uses the Standard Webhooks spec (https://www.standardwebhooks.com/)
// The signing secret is in the format: v1,whsec_<base64-encoded-key>
function verifyHook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.SUPABASE_HOOK_SECRET
  if (!secret) {
    console.error('[send-email hook] SUPABASE_HOOK_SECRET is not set')
    return false
  }

  const match = secret.match(/whsec_([A-Za-z0-9+/=]+)/)
  if (!match) {
    console.error('[send-email hook] Invalid SUPABASE_HOOK_SECRET format — expected v1,whsec_<base64>')
    return false
  }

  const key = Buffer.from(match[1], 'base64')
  const id = headers.get('webhook-id') ?? ''
  const ts = headers.get('webhook-timestamp') ?? ''
  const sigHeader = headers.get('webhook-signature') ?? ''

  if (!id || !ts || !sigHeader) return false

  const signed = `${id}.${ts}.${rawBody}`
  const computed = createHmac('sha256', key).update(signed).digest('base64')

  return sigHeader.split(' ').some((s) => {
    const val = s.startsWith('v1,') ? s.slice(3) : s
    try {
      return timingSafeEqual(Buffer.from(computed, 'base64'), Buffer.from(val, 'base64'))
    } catch {
      return false
    }
  })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://brickbook.com.au'

function verifyUrl(tokenHash: string, type: string, redirectTo: string): string {
  const url = new URL('/auth/v1/verify', SUPABASE_URL)
  url.searchParams.set('token', tokenHash)
  url.searchParams.set('type', type)
  url.searchParams.set('redirect_to', redirectTo)
  return url.toString()
}

type HookUser = {
  email: string
  new_email?: string
}

type HookEmailData = {
  token_hash?: string
  token_hash_new?: string
  redirect_to?: string
  email_action_type?: string
  site_url?: string
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  if (!verifyHook(rawBody, req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { user?: HookUser; email_data?: HookEmailData }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const user = payload.user
  const ed = payload.email_data
  const toEmail = user?.email ?? ''
  const { token_hash, token_hash_new, redirect_to, email_action_type, site_url } = ed ?? {}
  const redirectTo = redirect_to || site_url || SITE_URL

  console.log(`[send-email hook] action=${email_action_type} to=${toEmail}`)

  try {
    switch (email_action_type) {
      case 'signup':
      case 'invite': {
        if (!token_hash) break
        const confirmUrl = verifyUrl(token_hash, email_action_type, redirectTo)
        await sendEmail(toEmail, 'confirm-signup', { confirmUrl })
        break
      }

      case 'recovery': {
        if (!token_hash) break
        const resetUrl = verifyUrl(token_hash, 'recovery', redirectTo)
        await sendEmail(toEmail, 'forgot-password', { resetUrl })
        break
      }

      case 'email_change': {
        // Sent to the current (old) email address
        if (token_hash) {
          const confirmUrl = verifyUrl(token_hash, 'email_change', redirectTo)
          await sendEmail(toEmail, 'confirm-email', {
            newEmail: user?.new_email ?? '',
            confirmUrl,
          })
        }
        // If "Secure email change" is on, also confirm from the new address
        if (token_hash_new && user?.new_email) {
          const confirmUrl = verifyUrl(token_hash_new, 'email_change', redirectTo)
          await sendEmail(user.new_email, 'confirm-email', {
            newEmail: user.new_email,
            confirmUrl,
          })
        }
        break
      }

      default:
        console.warn(`[send-email hook] Unhandled action type: ${email_action_type}`)
    }
  } catch (err) {
    console.error('[send-email hook] Failed to send email:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({})
}
