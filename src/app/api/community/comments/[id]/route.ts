import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const content = (body?.content ?? '').trim()
  if (!content) return NextResponse.json({ error: 'Content is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: comment } = await admin
    .from('community_comments')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()

  if (!comment) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (comment.user_id !== user.id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { data: updated } = await admin
    .from('community_comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, content, updated_at')
    .single()

  return NextResponse.json({ comment: updated })
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
  const { data: comment } = await admin
    .from('community_comments')
    .select('user_id, post_id')
    .eq('id', id)
    .maybeSingle()

  if (!comment) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (comment.user_id !== user.id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  await admin.from('community_comments').delete().eq('id', id)

  // Decrement post comment_count
  const { data: post } = await admin
    .from('community_posts')
    .select('comment_count')
    .eq('id', comment.post_id)
    .maybeSingle()
  if (post) {
    await admin
      .from('community_posts')
      .update({ comment_count: Math.max(0, (post.comment_count as number) - 1) })
      .eq('id', comment.post_id)
  }

  return NextResponse.json({ ok: true })
}
