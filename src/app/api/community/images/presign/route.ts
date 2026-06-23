import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'brickbook-build-images'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const files: { name: string; type: string }[] = Array.isArray(body?.files) ? body.files : []

  if (!files.length || files.length > 4) {
    return NextResponse.json({ error: 'Between 1 and 4 files required.' }, { status: 400 })
  }

  for (const f of files) {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${f.type}` }, { status: 400 })
    }
  }

  const admin = createAdminClient()
  const uploads: { signedUrl: string; path: string }[] = []

  for (const f of files) {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const relativePath = `community/${user.id}/${crypto.randomUUID()}.${ext}`
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(relativePath)

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to generate upload URL.' }, { status: 500 })
    }
    uploads.push({ signedUrl: data.signedUrl, path: relativePath })
  }

  return NextResponse.json({ uploads })
}
