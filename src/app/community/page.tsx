import { createClient } from '@/lib/supabase/server'
import { getCommunityFeed, getTopContributors } from '@/lib/community-data'
import Nav from '@/components/Nav'
import CommunityFeedClient from './community-feed-client'
import type { FeedSort } from '@/lib/community-data'

export const metadata = { title: 'Community · Brickbook' }

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; tags?: string; search?: string }>
}) {
  const { sort: sortParam, tags: tagsParam, search } = await searchParams
  const sort = (['latest', 'active', 'unanswered'].includes(sortParam ?? '') ? sortParam : 'latest') as FeedSort
  const tags = tagsParam?.split(',').filter(Boolean) ?? []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let navUser = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username,display_name,avatar_path')
      .eq('id', user.id)
      .maybeSingle()
    navUser = profile ? { id: user.id, username: profile.username as string, display_name: profile.display_name as string ?? undefined, avatar_path: profile.avatar_path as string ?? undefined } : null
  }

  const [{ posts, hasMore }, topContributors] = await Promise.all([
    getCommunityFeed({ sort, tags, search: search ?? '', offset: 0, limit: 20, currentUserId: user?.id ?? null }),
    getTopContributors(8),
  ])

  return (
    <div className="page-shell">
      <Nav user={navUser} />
      <CommunityFeedClient
        initialPosts={posts}
        initialHasMore={hasMore}
        initialSort={sort}
        initialTags={tags}
        initialSearch={search ?? ''}
        currentUserId={user?.id ?? null}
        currentUsername={navUser?.username ?? null}
        topContributors={topContributors}
      />
    </div>
  )
}
