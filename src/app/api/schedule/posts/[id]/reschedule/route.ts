import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'

/**
 * PUT /api/schedule/posts/[id]/reschedule
 *
 * Remarcar um post para um novo horário.
 *
 * Request body:
 * {
 *   "date": "YYYY-MM-DD",     // nova data
 *   "time": "HH:mm" | null    // novo horário (opcional)
 * }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params
    const body = await request.json() as {
      date?: string
      time?: string | null
    }

    if (!body.date) {
      return NextResponse.json(
        { error: 'date field required (format: YYYY-MM-DD)' },
        { status: 400 },
      )
    }

    // Valida formato da data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(body.date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 },
      )
    }

    // Valida formato da hora (se fornecido)
    if (body.time) {
      const timeRegex = /^\d{2}:\d{2}$/
      if (!timeRegex.test(body.time)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:mm' },
          { status: 400 },
        )
      }
    }

    // Verifica se o post pertence ao usuário e pode ser remarcado
    const { data: post, error: postError } = await supabase
      .from('schedule_posts')
      .select('id, status, date, time')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Só permite remarcar posts que ainda não foram publicados
    if (post.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot reschedule a published post' },
        { status: 409 },
      )
    }

    // Se o post já foi tentado e falhou, reseta o contador de tentativas
    const updates: Record<string, unknown> = {
      date: body.date,
      time: body.time ?? null,
      updated_at: new Date().toISOString(),
    }

    // Se o post estava com erro, limpa o erro ao remarcar
    if (post.status === 'planned') {
      updates.publish_error = null
      updates.publish_attempts = 0
    }

    const { error } = await supabase
      .from('schedule_posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      postId: id,
      newDate: body.date,
      newTime: body.time ?? null,
      message: `Post remarcado para ${body.date} às ${body.time || '(sem horário)'}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao remarcar post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
