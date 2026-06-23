import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCommunityPost, COMMUNITY_TAGS } from '@/lib/community-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const result = await getCommunityPost(id, user?.id ?? null)
  if (!result) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return NextResponse.json(result)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const postBody = body.body === null ? null : typeof body.body === 'string' ? body.body.trim() || null : null
  const tags = Array.isArray(body.tags) ? (body.tags as string[]).filter((t) => (COMMUNITY_TAGS as readonly string[]).includes(t)).slice(0, 3) : []
  const rawBuildId: string | null = body.buildId ?? null

  if (!title || title.length < 5 || title.length > 150) {
    return NextResponse.json({ error: 'Title must be 5–150 characters.' }, { status: 422 })
  }

  const admin = createAdminClient()
  const { data: post } = await admin.from('community_posts').select('user_id').eq('id', id).maybeSingle()
  if (!post) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  // Validate build ownership if a build link was supplied; null clears the link
  let buildId: string | null = null
  if (rawBuildId) {
    const { data: build } = await admin
      .from('builds')
      .select('id')
      .eq('id', rawBuildId)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!build) return NextResponse.json({ error: 'Build not found or not yours.' }, { status: 403 })
    buildId = build.id as string
  }

  await admin.from('community_posts').update({ title, body: postBody, tags, build_id: buildId, updated_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: post } = await admin
    .from('community_posts')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()

  if (!post) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  await admin.from('community_posts').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
