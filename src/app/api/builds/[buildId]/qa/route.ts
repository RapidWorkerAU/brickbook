import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ buildId: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { buildId } = await params
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('build_qa')
    .select('id, build_id, asker_id, question, answer, answered_at, created_at')
    .eq('build_id', buildId)
    .order('created_at', { ascending: false })

  if (!rows?.length) return NextResponse.json({ items: [] })

  const askerIds = [...new Set((rows as { asker_id: string }[]).map((r) => r.asker_id))]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, display_name')
    .in('id', askerIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { id: string; username: string; display_name: string | null }]),
  )

  const items = (rows as {
    id: string
    build_id: string
    asker_id: string
    question: string
    answer: string | null
    answered_at: string | null
    created_at: string
  }[]).map((r) => {
    const p = profileMap.get(r.asker_id)
    return {
      id: r.id,
      buildId: r.build_id,
      askerId: r.asker_id,
      askerUsername: p?.username ?? 'unknown',
      askerDisplayName: p?.display_name ?? null,
      question: r.question,
      answer: r.answer,
      answeredAt: r.answered_at,
      createdAt: r.created_at,
    }
  })

  return NextResponse.json({ items })
}

export async function POST(request: Request, { params }: Params) {
  const { buildId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to ask a question.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const question = (body?.question ?? '').trim()
  if (!question || question.length < 5 || question.length > 500) {
    return NextResponse.json({ error: 'Question must be between 5 and 500 characters.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Prevent the build owner from asking questions on their own build
  const { data: build } = await admin.from('builds').select('owner_id').eq('id', buildId).maybeSingle()
  if (!build) return NextResponse.json({ error: 'Build not found.' }, { status: 404 })
  if (build.owner_id === user.id) {
    return NextResponse.json({ error: 'You cannot ask questions on your own build.' }, { status: 403 })
  }

  const { data: row, error } = await admin
    .from('build_qa')
    .insert({ build_id: buildId, asker_id: user.id, question })
    .select('id, build_id, asker_id, question, answer, answered_at, created_at')
    .single()

  if (error || !row) return NextResponse.json({ error: error?.message ?? 'Failed to submit question.' }, { status: 500 })

  const { data: profile } = await admin.from('profiles').select('username, display_name').eq('id', user.id).maybeSingle()

  const item = {
    id: (row as { id: string }).id,
    buildId: (row as { build_id: string }).build_id,
    askerId: (row as { asker_id: string }).asker_id,
    askerUsername: (profile as { username: string } | null)?.username ?? 'unknown',
    askerDisplayName: (profile as { display_name: string | null } | null)?.display_name ?? null,
    question: (row as { question: string }).question,
    answer: null,
    answeredAt: null,
    createdAt: (row as { created_at: string }).created_at,
  }

  return NextResponse.json({ item }, { status: 201 })
}
