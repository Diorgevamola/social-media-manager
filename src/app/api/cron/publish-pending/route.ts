import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishPost, tryPublishReelContainer } from '@/lib/instagram/publishing'
import { decryptToken } from '@/lib/token-crypto'
import type { SchedulePostRow, InstagramAccount } from '@/types/database'

export const maxDuration = 60 // Vercel Hobby: máximo 60s

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
    ?? request.headers.get('authorization')?.replace('Bearer ', '')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()

  // ── 1. Reels com container pendente ─────────────────────────────────────────
  const { data: pendingReels } = await supabase
    .from('schedule_posts')
    .select('id, ig_container_id, schedule_id, publish_attempts')
    .eq('status', 'planned')
    .not('ig_container_id', 'is', null)
    .lt('publish_attempts', 5)

  // Busca as contas dos reels pendentes
  const pendingScheduleIds = [...new Set((pendingReels ?? []).map(p => p.schedule_id))]
  const { data: pendingSchedules } = pendingScheduleIds.length > 0
    ? await supabase.from('schedules').select('id, account_id').in('id', pendingScheduleIds)
    : { data: [] }

  const pendingAccountIds = [...new Set((pendingSchedules ?? []).map(s => s.account_id).filter(Boolean))]
  const { data: pendingAccounts } = pendingAccountIds.length > 0
    ? await supabase.from('instagram_accounts').select('id, ig_user_id, access_token').in('id', pendingAccountIds)
    : { data: [] }

  const pendingScheduleMap = new Map((pendingSchedules ?? []).map(s => [s.id, s.account_id]))
  const pendingAccountMap = new Map((pendingAccounts ?? []).map(a => [a.id, a]))

  let reelsPublished = 0

  for (const row of pendingReels ?? []) {
    const accountId = pendingScheduleMap.get(row.schedule_id)
    if (!accountId) continue
    const account = pendingAccountMap.get(accountId) as Pick<InstagramAccount, 'id' | 'ig_user_id' | 'access_token'> | undefined
    if (!account?.ig_user_id || !account.access_token) continue

    try {
      const plainToken = decryptToken(account.access_token)
      const igMediaId = await tryPublishReelContainer(account.ig_user_id, plainToken, row.ig_container_id!)
      if (igMediaId) {
        await supabase
          .from('schedule_posts')
          .update({ status: 'published', published_at: now.toISOString(), ig_media_id: igMediaId, ig_container_id: null, publish_error: null })
          .eq('id', row.id)
        reelsPublished++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      await supabase.from('schedule_posts').update({ publish_error: message, ig_container_id: null }).eq('id', row.id)
    }
  }

  // ── 2. Posts novos com horário vencido ────────────────────────────────────────
  const { data: posts } = await supabase
    .from('schedule_posts')
    .select('*')
    .eq('status', 'planned')
    .is('ig_container_id', null)
    .lt('publish_attempts', 3)
    .or('generated_image_url.not.is.null,generated_video_url.not.is.null')

  const due = (posts as SchedulePostRow[] ?? []).filter(p => {
    const scheduledAt = new Date(`${p.date}T${p.time ?? '00:00'}:00`)
    return scheduledAt <= now
  })

  if (due.length === 0) {
    return NextResponse.json({ published: reelsPublished, pending_reels: 0, errors: 0 })
  }

  const scheduleIds = [...new Set(due.map(p => p.schedule_id))]
  const { data: schedules } = await supabase.from('schedules').select('id, account_id').in('id', scheduleIds)
  const scheduleToAccount = new Map((schedules ?? []).map(s => [s.id, s.account_id]))

  const accountIds = [...new Set([...scheduleToAccount.values()].filter(Boolean))]
  const { data: accounts } = await supabase
    .from('instagram_accounts')
    .select('id, ig_user_id, access_token')
    .in('id', accountIds)
    .not('access_token', 'is', null)
    .not('ig_user_id', 'is', null)

  const accountMap = new Map((accounts ?? []).map(a => [a.id, a as Pick<InstagramAccount, 'id' | 'ig_user_id' | 'access_token'>]))

  let published = 0
  let pendingReelCount = 0
  let errors = 0

  for (const post of due) {
    const accountId = scheduleToAccount.get(post.schedule_id)
    if (!accountId) continue
    const account = accountMap.get(accountId)
    if (!account) continue

    const decryptedAccount = {
      ...account,
      access_token: account.access_token ? decryptToken(account.access_token) : '',
    }

    await supabase
      .from('schedule_posts')
      .update({ publish_attempts: (post.publish_attempts ?? 0) + 1 })
      .eq('id', post.id)

    try {
      const result = await publishPost(post, decryptedAccount)

      if (result.status === 'pending_reel') {
        await supabase
          .from('schedule_posts')
          .update({ ig_container_id: result.igContainerId, publish_error: null })
          .eq('id', post.id)
        pendingReelCount++
      } else {
        await supabase
          .from('schedule_posts')
          .update({ status: 'published', published_at: now.toISOString(), ig_media_id: result.igMediaId, publish_error: null })
          .eq('id', post.id)
        published++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      await supabase.from('schedule_posts').update({ publish_error: message }).eq('id', post.id)
      errors++
    }
  }

  return NextResponse.json({ published: published + reelsPublished, pending_reels: pendingReelCount, errors })
}
