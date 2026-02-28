import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SchedulePostRow } from '@/types/database'

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Busca o post
  const { data: post, error: postError } = await supabase
    .from('schedule_posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
  }

  const postRow = post as SchedulePostRow

  // Só pode reverter se estiver publicado ou com container pending
  if (postRow.status !== 'published' && !postRow.ig_container_id) {
    return NextResponse.json(
      { error: 'Post não está em estado reversível' },
      { status: 409 }
    )
  }

  try {
    // Limpa os dados de publicação e retorna o status para scheduled
    console.log('[Revert] Iniciando UPDATE para postId:', postId)

    const { data: updateResult, error: updateError } = await supabase
      .from('schedule_posts')
      .update({
        status: 'planned',
        ig_media_id: null,
        ig_container_id: null,
        published_at: null,
        publish_error: null,
        publish_attempts: 0,
      })
      .eq('id', postId)

    console.log('[Revert] Resultado do UPDATE:', { updateResult, updateError })

    if (updateError) {
      console.error('[Revert] ERRO no UPDATE:', updateError)
      return NextResponse.json({
        error: `Erro ao atualizar: ${updateError.message}`,
        details: updateError
      }, { status: 500 })
    }

    // Verificar se realmente foi atualizado
    const { data: verifyPost, error: verifyError } = await supabase
      .from('schedule_posts')
      .select('id, status, ig_media_id, published_at, updated_at')
      .eq('id', postId)
      .single()

    console.log('[Revert] Verificação pós-UPDATE:', { verifyPost, verifyError })

    if (verifyError) {
      console.error('[Revert] ERRO ao verificar:', verifyError)
      return NextResponse.json({
        error: `Erro ao verificar: ${verifyError.message}`
      }, { status: 500 })
    }

    console.log('[Revert] Status final do post:', verifyPost)

    return NextResponse.json({
      success: true,
      message: 'Status do post revertido para agendado',
      verifiedPost: verifyPost,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[Revert] EXCEÇÃO CAPTURADA:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
