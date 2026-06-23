import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Nav from '@/components/Nav'
import CreatePostClient from './create-post-client'

export const metadata = { title: 'Ask the Community · Brickbook' }

export default async function CommunityNewPage({
  searchParams,
}: {
  searchParams: Promise<{ buildId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/get-started?returnTo=/community/new')

  const { buildId: preselectedBuildId } = await searchParams

  const { data: profile } = await supabase
    .from('profiles')
    .select('username,display_name,avatar_path')
    .eq('id', user.id)
    .maybeSingle()

  const navUser = profile
    ? { id: user.id, username: profile.username as string, display_name: profile.display_name as string ?? undefined, avatar_path: profile.avatar_path as string ?? undefined }
    : null

  const admin = createAdminClient()
  const { data: buildsData } = await admin
    .from('builds')
    .select('id, title, slug')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const builds = (buildsData ?? []) as { id: string; title: string; slug: string }[]

  return (
    <>
      <Nav user={navUser} />
      <CreatePostClient builds={builds} initialBuildId={preselectedBuildId ?? null} />
    </>
  )
}
