import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'

/**
 * POST /api/schedule/posts/[id]/confirm
 *
 * Confirma um post para publicação automática.
 * Apenas posts confirmados serão publicados pelo cron job.
 *
 * Request body:
 * {
 *   "confirmed": true|false
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params
    const body = await request.json() as { confirmed: boolean }

    if (typeof body.confirmed !== 'boolean') {
      return NextResponse.json(
        { error: 'confirmed field required and must be boolean' },
        { status: 400 },
      )
    }

    // Verifica se o post pertence ao usuário
    const { data: post, error: postError } = await supabase
      .from('schedule_posts')
      .select('id, status, confirmed')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Atualiza confirmação
    const updateData: Record<string, unknown> = {
      confirmed: body.confirmed,
      updated_at: new Date().toISOString(),
    }

    // Se confirmando, também garante que o status está 'planned' para o cron processar
    if (body.confirmed && post.status !== 'published') {
      updateData.status = 'planned'
    }

    const { error } = await supabase
      .from('schedule_posts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      postId: id,
      confirmed: body.confirmed,
      message: body.confirmed
        ? 'Post confirmado para publicação automática'
        : 'Post confirmação removida',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao confirmar post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
