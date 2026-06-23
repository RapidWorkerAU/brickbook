import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const commentId: string | null = body?.commentId ?? null

  const admin = createAdminClient()

  // Verify post ownership
  const { data: post } = await admin
    .from('community_posts')
    .select('user_id')
    .eq('id', postId)
    .maybeSingle()

  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Only the post author can mark an accepted answer.' }, { status: 403 })

  if (commentId) {
    // Verify comment belongs to this post
    const { data: comment } = await admin
      .from('community_comments')
      .select('id')
      .eq('id', commentId)
      .eq('post_id', postId)
      .maybeSingle()
    if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 })
  }

  // Toggle: if same comment, clear it; otherwise set it
  await admin
    .from('community_posts')
    .update({ accepted_comment_id: commentId })
    .eq('id', postId)

  return NextResponse.json({ acceptedCommentId: commentId })
}
