import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'

/**
 * POST /api/schedule/posts/[id]/unschedule
 *
 * Remove um post do cronograma (desagenda).
 * Reseta o post para status 'planned' mas NÃO confirmado, removendo qualquer IDs do Instagram.
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

    // Verifica se o post pertence ao usuário e pode ser desagendado
    const { data: post, error: postError } = await supabase
      .from('schedule_posts')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Só permite desagendar posts que ainda não foram publicados
    if (post.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot unschedule a published post' },
        { status: 409 },
      )
    }

    // Reseta o post: status='planned', confirmed=false, remove IDs do Instagram
    const { error } = await supabase
      .from('schedule_posts')
      .update({
        status: 'planned',
        confirmed: false,
        ig_media_id: null,
        ig_container_id: null,
        publish_error: null,
        publish_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      postId: id,
      message: 'Post removido do cronograma',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao desagendar post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
