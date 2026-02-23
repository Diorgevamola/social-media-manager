import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const body = await request.json() as { postIds: string[]; confirmed: boolean }
    const { postIds, confirmed } = body

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ error: 'postIds obrigatório' }, { status: 400 })
    }

    const { error } = await supabase
      .from('schedule_posts')
      .update({ confirmed, updated_at: new Date().toISOString() })
      .in('id', postIds)
      .eq('user_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, updated: postIds.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao confirmar posts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
