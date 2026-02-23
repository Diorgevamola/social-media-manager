import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishPost } from '@/lib/instagram/publishing'
import { decryptToken } from '@/lib/token-crypto'
import type { SchedulePostRow, InstagramAccount } from '@/types/database'

export async function POST(
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

  if (postRow.status === 'published') {
    return NextResponse.json({ error: 'Post já publicado' }, { status: 409 })
  }

  if (!postRow.generated_image_url && !postRow.generated_video_url) {
    return NextResponse.json({ error: 'Post sem mídia gerada' }, { status: 422 })
  }

  // Busca a conta do Instagram via schedule
  const { data: schedule } = await supabase
    .from('schedules')
    .select('account_id')
    .eq('id', postRow.schedule_id)
    .single()

  if (!schedule?.account_id) {
    return NextResponse.json({ error: 'Cronograma sem conta vinculada' }, { status: 422 })
  }

  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('id, ig_user_id, access_token, token_expires_at')
    .eq('id', schedule.account_id)
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  const accountRow = account as Pick<InstagramAccount, 'id' | 'ig_user_id' | 'access_token' | 'token_expires_at'>

  if (!accountRow.ig_user_id || !accountRow.access_token) {
    return NextResponse.json({ error: 'Conta não conectada ao Meta. Conecte em /dashboard/accounts.' }, { status: 422 })
  }

  const decryptedAccount = {
    ...accountRow,
    access_token: decryptToken(accountRow.access_token),
  }

  // Incrementa tentativas antes de publicar
  await supabase
    .from('schedule_posts')
    .update({ publish_attempts: (postRow.publish_attempts ?? 0) + 1 })
    .eq('id', postId)

  try {
    const result = await publishPost(postRow, decryptedAccount)

    if (result.status === 'pending_reel') {
      await supabase
        .from('schedule_posts')
        .update({
          ig_container_id: result.igContainerId,
          publish_error: null,
        })
        .eq('id', postId)
      return NextResponse.json({ success: true, status: 'pending_reel', igContainerId: result.igContainerId })
    }

    await supabase
      .from('schedule_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        ig_media_id: result.igMediaId,
        publish_error: null,
      })
      .eq('id', postId)

    return NextResponse.json({ success: true, status: 'published', igMediaId: result.igMediaId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'

    await supabase
      .from('schedule_posts')
      .update({ publish_error: message })
      .eq('id', postId)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
