import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCommunityPost } from '@/lib/community-data'
import Nav from '@/components/Nav'
import CommunityPostClient from './community-post-client'

export default async function CommunityPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const [{ postId }, { returnTo }] = await Promise.all([params, searchParams])

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

  const result = await getCommunityPost(postId, user?.id ?? null)
  if (!result) notFound()

  // Only fetch owner's builds when the current user is the post author (for edit form)
  let ownerBuilds: { id: string; title: string; slug: string }[] = []
  if (user && user.id === result.post.userId) {
    const admin = createAdminClient()
    const { data: buildsData } = await admin
      .from('builds')
      .select('id, title, slug')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    ownerBuilds = (buildsData ?? []) as { id: string; title: string; slug: string }[]
  }

  return (
    <div className="page-shell">
      <Nav user={navUser} />
      <CommunityPostClient
        post={result.post}
        initialComments={result.comments}
        currentUserId={user?.id ?? null}
        currentUsername={navUser?.username ?? null}
        returnTo={returnTo ?? null}
        ownerBuilds={ownerBuilds}
      />
    </div>
  )
}
