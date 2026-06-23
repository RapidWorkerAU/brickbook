import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ buildId: string; qaId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { buildId, qaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const answer = (body?.answer ?? '').trim()
  if (!answer) return NextResponse.json({ error: 'Answer cannot be empty.' }, { status: 400 })

  const admin = createAdminClient()

  // Verify the caller is the build owner
  const { data: build } = await admin.from('builds').select('owner_id').eq('id', buildId).maybeSingle()
  if (!build) return NextResponse.json({ error: 'Build not found.' }, { status: 404 })
  if (build.owner_id !== user.id) return NextResponse.json({ error: 'Only the build owner can answer questions.' }, { status: 403 })

  const answeredAt = new Date().toISOString()
  const { error } = await admin
    .from('build_qa')
    .update({ answer, answered_at: answeredAt })
    .eq('id', qaId)
    .eq('build_id', buildId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, answeredAt })
}

export async function DELETE(_request: Request, { params }: Params) {
  const { buildId, qaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const admin = createAdminClient()

  const { data: qa } = await admin
    .from('build_qa')
    .select('asker_id, build_id')
    .eq('id', qaId)
    .eq('build_id', buildId)
    .maybeSingle()

  if (!qa) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const { data: build } = await admin.from('builds').select('owner_id').eq('id', buildId).maybeSingle()
  const isOwner = build?.owner_id === user.id
  const isAsker = (qa as { asker_id: string }).asker_id === user.id

  if (!isOwner && !isAsker) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  await admin.from('build_qa').delete().eq('id', qaId)
  return NextResponse.json({ ok: true })
}
