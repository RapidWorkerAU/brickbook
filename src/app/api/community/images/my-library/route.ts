import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSignedImageUrls } from '@/lib/storage'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const admin = createAdminClient()

  // Get the user's builds
  const { data: builds } = await admin
    .from('builds')
    .select('id, title, slug')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (!builds?.length) return NextResponse.json({ images: [] })

  const buildIds = builds.map((b) => b.id as string)
  const buildMap = new Map(builds.map((b) => [b.id as string, b as { id: string; title: string; slug: string }]))

  const { data: images } = await admin
    .from('build_images')
    .select('id, build_id, storage_path, image_kind, created_at')
    .in('build_id', buildIds)
    .in('image_kind', ['build', 'update', 'inspiration'])
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!images?.length) return NextResponse.json({ images: [] })

  const paths = images.map((img) => img.storage_path as string).filter(Boolean)
  const signedUrls = await getSignedImageUrls(paths)

  const result = images.map((img) => {
    const build = buildMap.get(img.build_id as string)
    return {
      id: img.id as string,
      buildId: img.build_id as string,
      buildTitle: build?.title ?? null,
      buildSlug: build?.slug ?? null,
      imageUrl: signedUrls.get(img.storage_path as string) ?? null,
      imageKind: img.image_kind as string,
    }
  }).filter((img) => img.imageUrl)

  return NextResponse.json({ images: result })
}
