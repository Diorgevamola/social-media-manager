import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'
import { getPublishLog, getPublishStats } from '@/lib/publish-logging'

/**
 * GET /api/schedule/posts/[id]/status
 *
 * Retorna o status atual de publicação de um post, incluindo:
 * - Status geral (planned, published, error)
 * - Confirmação do usuário
 * - Histórico de tentativas de publicação
 * - Estatísticas de publicação
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params

    // Busca o post
    const { data: post, error } = await supabase
      .from('schedule_posts')
      .select('id, status, confirmed, published_at, ig_media_id, ig_container_id, publish_error, publish_attempts, date, time, publish_history')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    // Busca histórico de tentativas
    const publishLog = await getPublishLog(id, userId)

    // Calcula estatísticas
    const stats = await getPublishStats(id, userId)

    // Formata resposta
    return NextResponse.json({
      postId: post.id,
      status: post.status,
      confirmed: post.confirmed,
      scheduledDate: post.date,
      scheduledTime: post.time,
      publishedAt: post.published_at,
      igMediaId: post.ig_media_id,
      igContainerId: post.ig_container_id,
      publishError: post.publish_error,
      publishAttempts: post.publish_attempts || 0,
      publishHistory: post.publish_history,
      statistics: stats,
      attemptLog: publishLog.map(log => ({
        id: log.id,
        attempt: log.attempt_number,
        status: log.status,
        timestamp: log.created_at,
        igMediaId: log.ig_media_id,
        igContainerId: log.ig_container_id,
        error: log.error_message,
        durationMs: log.duration_ms,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar status do post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
