import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: commentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to upvote.' }, { status: 401 })

  const admin = createAdminClient()

  const { data: comment } = await admin
    .from('community_comments')
    .select('id, upvote_count, user_id')
    .eq('id', commentId)
    .maybeSingle()
  if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 })

  // Cannot upvote own comment
  if (comment.user_id === user.id) {
    return NextResponse.json({ error: 'You cannot upvote your own comment.' }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('community_comment_upvotes')
    .select('comment_id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle()

  let upvoteCount: number
  let hasUpvoted: boolean

  if (existing) {
    // Remove upvote
    await admin
      .from('community_comment_upvotes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
    upvoteCount = Math.max(0, (comment.upvote_count as number) - 1)
    hasUpvoted = false
  } else {
    // Add upvote
    await admin
      .from('community_comment_upvotes')
      .insert({ comment_id: commentId, user_id: user.id })
    upvoteCount = (comment.upvote_count as number) + 1
    hasUpvoted = true
  }

  await admin
    .from('community_comments')
    .update({ upvote_count: upvoteCount })
    .eq('id', commentId)

  return NextResponse.json({ upvoteCount, hasUpvoted })
}
