import { createAdminClient } from '@/lib/supabase/admin'
import { getSignedImageUrls } from '@/lib/storage'

export const COMMUNITY_TAGS = [
  'Foundation', 'Brickwork', 'Framing', 'Roofing',
  'Electrical', 'Plumbing', 'Insulation', 'Plastering',
  'Tiling', 'Cabinetry', 'Landscaping', 'Budget',
  'Trades', 'Design', 'Inspections', 'Suppliers', 'Other',
] as const

export type CommunityTag = (typeof COMMUNITY_TAGS)[number]

export type CommunityImage = {
  id: string
  imageUrl: string
  buildImageId: string | null
  buildTitle: string | null
  buildSlug: string | null
  ownerUsername: string | null
}

export type CommunityComment = {
  id: string
  postId: string
  userId: string
  username: string
  displayName: string | null
  content: string
  parentCommentId: string | null
  image: CommunityImage | null
  upvoteCount: number
  hasUpvoted: boolean
  isAccepted: boolean
  createdAt: string
  replies: CommunityComment[]
}

export type CommunityPost = {
  id: string
  userId: string
  username: string
  displayName: string | null
  title: string
  body: string | null
  tags: string[]
  images: CommunityImage[]
  commentCount: number
  acceptedCommentId: string | null
  createdAt: string
  buildId: string | null
}

export type FeedSort = 'latest' | 'active' | 'unanswered'

export type TopContributor = {
  userId: string
  username: string
  displayName: string | null
  commentCount: number
}

// ─── helpers ────────────────────────────────────────────────────────────────

type RawPost = {
  id: string
  user_id: string
  title: string
  body: string | null
  tags: string[]
  accepted_comment_id: string | null
  comment_count: number
  created_at: string
  build_id: string | null
}

type RawPostImage = {
  id: string
  post_id: string
  build_image_id: string | null
  storage_path: string | null
  position: number
}

type RawComment = {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_comment_id: string | null
  build_image_id: string | null
  storage_path: string | null
  upvote_count: number
  created_at: string
}

async function resolveImages(
  rawImages: RawPostImage[] | RawComment[],
): Promise<Map<string, CommunityImage>> {
  const admin = createAdminClient()
  const out = new Map<string, CommunityImage>()
  if (!rawImages.length) return out

  // Collect all storage paths we need to sign
  const allPaths: string[] = []
  const buildImageIds: string[] = []

  for (const img of rawImages) {
    if ('storage_path' in img && img.storage_path) allPaths.push(img.storage_path)
    if ('build_image_id' in img && img.build_image_id) buildImageIds.push(img.build_image_id)
  }

  // Fetch build image paths + build info in one query
  type BuildImageRow = {
    id: string
    storage_path: string
    builds: {
      title: string
      slug: string
      profiles: { username: string } | null
    } | null
  }

  const buildImageMap = new Map<string, BuildImageRow>()
  if (buildImageIds.length > 0) {
    const { data: buildImages } = await admin
      .from('build_images')
      .select('id, storage_path, builds(title, slug, profiles!builds_owner_id_fkey(username))')
      .in('id', buildImageIds)
    for (const bi of (buildImages ?? []) as unknown as BuildImageRow[]) {
      buildImageMap.set(bi.id, bi)
      allPaths.push(bi.storage_path)
    }
  }

  const signedUrls = await getSignedImageUrls(allPaths)

  for (const img of rawImages) {
    const imgId = img.id
    let imageUrl = ''
    let buildTitle: string | null = null
    let buildSlug: string | null = null
    let ownerUsername: string | null = null
    let buildImageId: string | null = null

    if (img.build_image_id) {
      const bi = buildImageMap.get(img.build_image_id)
      if (bi) {
        imageUrl = signedUrls.get(bi.storage_path) ?? ''
        buildTitle = bi.builds?.title ?? null
        buildSlug = bi.builds?.slug ?? null
        ownerUsername = bi.builds?.profiles?.username ?? null
        buildImageId = bi.id
      }
    } else if (img.storage_path) {
      imageUrl = signedUrls.get(img.storage_path) ?? ''
    }

    out.set(imgId, { id: imgId, imageUrl, buildImageId, buildTitle, buildSlug, ownerUsername })
  }

  return out
}

// ─── getCommunityFeed ────────────────────────────────────────────────────────

export async function getCommunityFeed({
  sort = 'latest',
  tags = [],
  search = '',
  offset = 0,
  limit = 20,
  currentUserId = null,
  buildId = null,
}: {
  sort?: FeedSort
  tags?: string[]
  search?: string
  offset?: number
  limit?: number
  currentUserId?: string | null
  buildId?: string | null
} = {}): Promise<{ posts: CommunityPost[]; hasMore: boolean }> {
  const admin = createAdminClient()

  let query = admin
    .from('community_posts')
    .select('id, user_id, title, body, tags, accepted_comment_id, comment_count, created_at, build_id', { count: 'exact' })

  if (buildId) {
    query = query.eq('build_id', buildId)
  }
  if (sort === 'unanswered') {
    query = query.eq('comment_count', 0)
  }
  if (tags.length > 0) {
    query = query.overlaps('tags', tags)
  }
  if (search.trim()) {
    query = query.textSearch('title', search.trim(), { type: 'websearch', config: 'english' })
  }

  if (sort === 'active') {
    query = query.order('comment_count', { ascending: false }).order('created_at', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: rawPosts, count } = await query.range(offset, offset + limit - 1)
  if (!rawPosts?.length) return { posts: [], hasMore: false }

  const posts = rawPosts as RawPost[]
  const postIds = posts.map((p) => p.id)
  const userIds = [...new Set(posts.map((p) => p.user_id))]

  const [{ data: profiles }, { data: rawImages }] = await Promise.all([
    admin.from('profiles').select('id, username, display_name').in('id', userIds),
    admin
      .from('community_post_images')
      .select('id, post_id, build_image_id, storage_path, position')
      .in('post_id', postIds)
      .order('position'),
  ])

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p as { id: string; username: string; display_name: string | null }]))
  const imageMap = await resolveImages((rawImages ?? []) as RawPostImage[])

  const imagesByPost = new Map<string, CommunityImage[]>()
  for (const img of (rawImages ?? []) as RawPostImage[]) {
    const resolved = imageMap.get(img.id)
    if (!resolved) continue
    const list = imagesByPost.get(img.post_id) ?? []
    list.push(resolved)
    imagesByPost.set(img.post_id, list)
  }

  const result: CommunityPost[] = posts.map((p) => {
    const profile = profileMap.get(p.user_id)
    return {
      id: p.id,
      userId: p.user_id,
      username: profile?.username ?? 'unknown',
      displayName: profile?.display_name ?? null,
      title: p.title,
      body: p.body,
      tags: p.tags ?? [],
      images: imagesByPost.get(p.id) ?? [],
      commentCount: p.comment_count,
      acceptedCommentId: p.accepted_comment_id,
      createdAt: p.created_at,
      buildId: p.build_id,
    }
  })

  return { posts: result, hasMore: (count ?? 0) > offset + limit }
}

// ─── getCommunityPost ────────────────────────────────────────────────────────

export async function getCommunityPost(
  postId: string,
  currentUserId: string | null,
): Promise<{ post: CommunityPost; comments: CommunityComment[] } | null> {
  const admin = createAdminClient()

  const [{ data: rawPost }, { data: rawImages }, { data: rawComments }] = await Promise.all([
    admin
      .from('community_posts')
      .select('id, user_id, title, body, tags, accepted_comment_id, comment_count, created_at, build_id')
      .eq('id', postId)
      .maybeSingle(),
    admin
      .from('community_post_images')
      .select('id, post_id, build_image_id, storage_path, position')
      .eq('post_id', postId)
      .order('position'),
    admin
      .from('community_comments')
      .select('id, post_id, user_id, content, parent_comment_id, build_image_id, storage_path, upvote_count, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true }),
  ])

  if (!rawPost) return null

  const post = rawPost as RawPost
  const postImages = (rawImages ?? []) as RawPostImage[]
  const comments = (rawComments ?? []) as RawComment[]

  const userIds = [...new Set([post.user_id, ...comments.map((c) => c.user_id)])]

  const allImages = [
    ...postImages,
    ...comments.filter((c) => c.build_image_id || c.storage_path).map((c) => ({
      id: c.id,
      post_id: c.post_id,
      build_image_id: c.build_image_id,
      storage_path: c.storage_path,
      position: 0,
    })),
  ] as RawPostImage[]

  const [{ data: profiles }, imageMap, upvotedCommentIds] = await Promise.all([
    admin.from('profiles').select('id, username, display_name').in('id', userIds),
    resolveImages(allImages),
    currentUserId
      ? admin
          .from('community_comment_upvotes')
          .select('comment_id')
          .eq('user_id', currentUserId)
          .in('comment_id', comments.map((c) => c.id))
          .then(({ data }) => new Set((data ?? []).map((r) => r.comment_id as string)))
      : Promise.resolve(new Set<string>()),
  ])

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p as { id: string; username: string; display_name: string | null }]))
  const postImagesResolved = postImages.map((img) => imageMap.get(img.id)).filter(Boolean) as CommunityImage[]

  const profile = profileMap.get(post.user_id)
  const communityPost: CommunityPost = {
    id: post.id,
    userId: post.user_id,
    username: profile?.username ?? 'unknown',
    displayName: profile?.display_name ?? null,
    title: post.title,
    body: post.body,
    tags: post.tags ?? [],
    images: postImagesResolved,
    commentCount: post.comment_count,
    acceptedCommentId: post.accepted_comment_id,
    createdAt: post.created_at,
    buildId: post.build_id,
  }

  // Build comment tree (flat list → top-level + replies)
  const topLevel: CommunityComment[] = []
  const replyMap = new Map<string, CommunityComment[]>()

  for (const c of comments) {
    const cp = profileMap.get(c.user_id)
    const commentImage = c.build_image_id || c.storage_path ? imageMap.get(c.id) ?? null : null

    const item: CommunityComment = {
      id: c.id,
      postId: c.post_id,
      userId: c.user_id,
      username: cp?.username ?? 'unknown',
      displayName: cp?.display_name ?? null,
      content: c.content,
      parentCommentId: c.parent_comment_id,
      image: commentImage,
      upvoteCount: c.upvote_count,
      hasUpvoted: upvotedCommentIds.has(c.id),
      isAccepted: c.id === post.accepted_comment_id,
      createdAt: c.created_at,
      replies: [],
    }

    if (c.parent_comment_id) {
      const list = replyMap.get(c.parent_comment_id) ?? []
      list.push(item)
      replyMap.set(c.parent_comment_id, list)
    } else {
      topLevel.push(item)
    }
  }

  // Attach replies
  for (const comment of topLevel) {
    comment.replies = replyMap.get(comment.id) ?? []
  }

  // Sort: accepted answer first, then by upvotes desc
  topLevel.sort((a, b) => {
    if (a.isAccepted && !b.isAccepted) return -1
    if (!a.isAccepted && b.isAccepted) return 1
    return b.upvoteCount - a.upvoteCount
  })

  return { post: communityPost, comments: topLevel }
}

// ─── getTopContributors ──────────────────────────────────────────────────────

export async function getTopContributors(limit = 8): Promise<TopContributor[]> {
  const admin = createAdminClient()

  // Select only user_id — lightweight even with many rows
  const { data: rows } = await admin
    .from('community_comments')
    .select('user_id')

  if (!rows?.length) return []

  // Count comments per user in app code
  const countMap = new Map<string, number>()
  for (const row of rows as { user_id: string }[]) {
    countMap.set(row.user_id, (countMap.get(row.user_id) ?? 0) + 1)
  }

  const sorted = [...countMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)

  if (!sorted.length) return []

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, display_name')
    .in('id', sorted.map(([id]) => id))

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { id: string; username: string; display_name: string | null }]),
  )

  return sorted
    .map(([userId, commentCount]) => {
      const p = profileMap.get(userId)
      if (!p) return null
      return { userId, username: p.username, displayName: p.display_name, commentCount }
    })
    .filter(Boolean) as TopContributor[]
}
