import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCommunityFeed } from '@/lib/community-data'
import type { FeedSort } from '@/lib/community-data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sort = (searchParams.get('sort') ?? 'latest') as FeedSort
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) ?? []
  const search = searchParams.get('search') ?? ''
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))
  const limit = Math.min(30, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const buildId = searchParams.get('buildId') ?? null

  // Get current user (optional — affects nothing on feed read)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const result = await getCommunityFeed({ sort, tags, search, offset, limit, currentUserId: user?.id ?? null, buildId })
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to post.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const title = (body.title ?? '').trim()
  const postBody = (body.body ?? '').trim() || null
  const tags: string[] = Array.isArray(body.tags) ? body.tags : []
  const imagePaths: string[] = Array.isArray(body.imagePaths) ? body.imagePaths : []
  const buildImageIds: string[] = Array.isArray(body.buildImageIds) ? body.buildImageIds : []
  const rawBuildId: string | null = body.buildId ?? null

  if (!title || title.length < 5 || title.length > 150) {
    return NextResponse.json({ error: 'Title must be between 5 and 150 characters.' }, { status: 400 })
  }
  if (imagePaths.length + buildImageIds.length > 4) {
    return NextResponse.json({ error: 'Maximum 4 images per post.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Validate build ownership if a build link was supplied
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

  const { data: post, error: postError } = await admin
    .from('community_posts')
    .insert({ user_id: user.id, title, body: postBody, tags, build_id: buildId })
    .select('id, user_id, title, body, tags, accepted_comment_id, comment_count, created_at, build_id')
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: postError?.message ?? 'Failed to create post.' }, { status: 500 })
  }

  // Insert images
  const imageRows = [
    ...imagePaths.map((storage_path, i) => ({ post_id: post.id, storage_path, position: i })),
    ...buildImageIds.map((build_image_id, i) => ({ post_id: post.id, build_image_id, position: imagePaths.length + i })),
  ]
  if (imageRows.length > 0) {
    await admin.from('community_post_images').insert(imageRows)
  }

  return NextResponse.json({ post }, { status: 201 })
}
