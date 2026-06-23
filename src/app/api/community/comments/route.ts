import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to comment.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const postId = body.postId as string | undefined
  const content = (body.content ?? '').trim()
  const parentCommentId = body.parentCommentId as string | null ?? null
  const storagePath = body.storagePath as string | null ?? null
  const buildImageId = body.buildImageId as string | null ?? null

  if (!postId) return NextResponse.json({ error: 'postId is required.' }, { status: 400 })
  if (!content) return NextResponse.json({ error: 'Comment cannot be empty.' }, { status: 400 })

  const admin = createAdminClient()

  // Verify post exists
  const { data: post } = await admin
    .from('community_posts')
    .select('id, comment_count')
    .eq('id', postId)
    .maybeSingle()
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })

  // Verify parent comment belongs to same post
  if (parentCommentId) {
    const { data: parent } = await admin
      .from('community_comments')
      .select('id')
      .eq('id', parentCommentId)
      .eq('post_id', postId)
      .maybeSingle()
    if (!parent) return NextResponse.json({ error: 'Parent comment not found.' }, { status: 404 })
  }

  const insertPayload: Record<string, unknown> = {
    post_id: postId,
    user_id: user.id,
    content,
    parent_comment_id: parentCommentId,
  }
  if (storagePath) insertPayload.storage_path = storagePath
  if (buildImageId) insertPayload.build_image_id = buildImageId

  const { data: comment, error: commentError } = await admin
    .from('community_comments')
    .insert(insertPayload)
    .select('id, post_id, user_id, content, parent_comment_id, build_image_id, storage_path, upvote_count, created_at')
    .single()

  if (commentError || !comment) {
    return NextResponse.json({ error: commentError?.message ?? 'Failed to post comment.' }, { status: 500 })
  }

  // Increment comment_count on post
  const newCount = (post.comment_count as number) + 1
  await admin.from('community_posts').update({ comment_count: newCount }).eq('id', postId)

  // Fetch commenter profile
  const { data: profile } = await admin
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    comment: {
      ...comment,
      username: profile?.username ?? 'unknown',
      displayName: profile?.display_name ?? null,
    },
    commentCount: newCount,
  }, { status: 201 })
}
