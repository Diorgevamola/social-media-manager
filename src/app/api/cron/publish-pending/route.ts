import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishPost, tryPublishReelContainer } from '@/lib/instagram/publishing'
import { decryptToken } from '@/lib/token-crypto'
import { logPublishAttempt, updatePostPublishHistory, sleep } from '@/lib/publish-logging'
import type { SchedulePostRow, InstagramAccount } from '@/types/database'

export const maxDuration = 60 // Vercel Hobby: máximo 60s

interface PublishStats {
  publishedCount: number
  pendingReelsCount: number
  errorCount: number
  attempts: Array<{
    postId: string
    status: 'success' | 'pending_reel' | 'error'
    igMediaId?: string
    igContainerId?: string
    error?: string
    attempt: number
  }>
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
    ?? request.headers.get('authorization')?.replace('Bearer ', '')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const stats: PublishStats = {
    publishedCount: 0,
    pendingReelsCount: 0,
    errorCount: 0,
    attempts: [],
  }

  // ── 1. Reels com container pendente (confirmados) ────────────────────────────
  const { data: pendingReels } = await supabase
    .from('schedule_posts')
    .select('id, ig_container_id, schedule_id, publish_attempts, user_id')
    .eq('status', 'planned')
    .eq('confirmed', true)
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

  for (const row of pendingReels ?? []) {
    const accountId = pendingScheduleMap.get(row.schedule_id)
    if (!accountId) continue
    const account = pendingAccountMap.get(accountId) as Pick<InstagramAccount, 'id' | 'ig_user_id' | 'access_token'> | undefined
    if (!account?.ig_user_id || !account.access_token) continue

    const startTime = Date.now()
    const attempt = (row.publish_attempts ?? 0) + 1

    try {
      const plainToken = decryptToken(account.access_token)
      const igMediaId = await tryPublishReelContainer(account.ig_user_id, plainToken, row.ig_container_id!)
      if (igMediaId) {
        const duration = Date.now() - startTime
        await supabase
          .from('schedule_posts')
          .update({
            status: 'published',
            published_at: now.toISOString(),
            ig_media_id: igMediaId,
            ig_container_id: null,
            publish_error: null,
            publish_attempts: attempt,
          })
          .eq('id', row.id)

        await logPublishAttempt({
          postId: row.id,
          userId: row.user_id,
          attemptNumber: attempt,
          status: 'success',
          igMediaId,
          durationMs: duration,
        })

        await updatePostPublishHistory(row.id, row.user_id, attempt, 'success', { igMediaId })

        stats.publishedCount++
        stats.attempts.push({
          postId: row.id,
          status: 'success',
          igMediaId,
          attempt,
        })
      }
    } catch (err) {
      const duration = Date.now() - startTime
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      await supabase.from('schedule_posts').update({
        publish_error: message,
        ig_container_id: null,
        publish_attempts: attempt,
      }).eq('id', row.id)

      await logPublishAttempt({
        postId: row.id,
        userId: row.user_id,
        attemptNumber: attempt,
        status: 'error',
        errorMessage: message,
        durationMs: duration,
      })

      await updatePostPublishHistory(row.id, row.user_id, attempt, 'error', { error: message })

      stats.errorCount++
      stats.attempts.push({
        postId: row.id,
        status: 'error',
        error: message,
        attempt,
      })
    }
  }

  // ── 2. Posts confirmados com horário vencido ─────────────────────────────────
  const { data: posts } = await supabase
    .from('schedule_posts')
    .select('*')
    .eq('status', 'planned')
    .eq('confirmed', true)
    .is('ig_container_id', null)
    .lt('publish_attempts', 3)
    .or('generated_image_url.not.is.null,generated_video_url.not.is.null')

  const due = (posts as SchedulePostRow[] ?? []).filter(p => {
    const scheduledAt = new Date(`${p.date}T${p.time ?? '00:00'}:00`)
    return scheduledAt <= now
  })

  if (due.length === 0) {
    return NextResponse.json({
      published: stats.publishedCount,
      pending_reels: stats.pendingReelsCount,
      errors: stats.errorCount,
      attempts: stats.attempts.length,
      details: stats.attempts,
    })
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

  for (const post of due) {
    const accountId = scheduleToAccount.get(post.schedule_id)
    if (!accountId) continue
    const account = accountMap.get(accountId)
    if (!account) continue

    const decryptedAccount = {
      ...account,
      access_token: account.access_token ? decryptToken(account.access_token) : '',
    }

    const startTime = Date.now()
    const attempt = (post.publish_attempts ?? 0) + 1

    await supabase
      .from('schedule_posts')
      .update({ publish_attempts: attempt })
      .eq('id', post.id)

    try {
      const result = await publishPost(post, decryptedAccount)
      const duration = Date.now() - startTime

      if (result.status === 'pending_reel') {
        await supabase
          .from('schedule_posts')
          .update({
            ig_container_id: result.igContainerId,
            publish_error: null,
          })
          .eq('id', post.id)

        await logPublishAttempt({
          postId: post.id,
          userId: post.user_id,
          attemptNumber: attempt,
          status: 'pending_reel',
          igContainerId: result.igContainerId,
          durationMs: duration,
        })

        await updatePostPublishHistory(post.id, post.user_id, attempt, 'pending_reel', {
          igContainerId: result.igContainerId,
        })

        stats.pendingReelsCount++
        stats.attempts.push({
          postId: post.id,
          status: 'pending_reel',
          igContainerId: result.igContainerId,
          attempt,
        })
      } else if (result.status === 'published_sequence') {
        // Para sequências de stories, armazena o primeiro ID e todos os IDs em notes
        await supabase
          .from('schedule_posts')
          .update({
            status: 'published',
            published_at: now.toISOString(),
            ig_media_id: result.igMediaIds[0],
            publish_error: null,
            notes: JSON.stringify({ story_sequence_ids: result.igMediaIds }),
          })
          .eq('id', post.id)

        await logPublishAttempt({
          postId: post.id,
          userId: post.user_id,
          attemptNumber: attempt,
          status: 'success',
          igMediaId: result.igMediaIds[0],
          durationMs: duration,
        })

        await updatePostPublishHistory(post.id, post.user_id, attempt, 'success', {
          igMediaId: result.igMediaIds[0],
        })

        stats.publishedCount++
        stats.attempts.push({
          postId: post.id,
          status: 'success',
          igMediaId: result.igMediaIds[0],
          attempt,
        })
      } else {
        await supabase
          .from('schedule_posts')
          .update({
            status: 'published',
            published_at: now.toISOString(),
            ig_media_id: result.igMediaId,
            publish_error: null,
          })
          .eq('id', post.id)

        await logPublishAttempt({
          postId: post.id,
          userId: post.user_id,
          attemptNumber: attempt,
          status: 'success',
          igMediaId: result.igMediaId,
          durationMs: duration,
        })

        await updatePostPublishHistory(post.id, post.user_id, attempt, 'success', {
          igMediaId: result.igMediaId,
        })

        stats.publishedCount++
        stats.attempts.push({
          postId: post.id,
          status: 'success',
          igMediaId: result.igMediaId,
          attempt,
        })
      }
    } catch (err) {
      const duration = Date.now() - startTime
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      await supabase.from('schedule_posts').update({
        publish_error: message,
      }).eq('id', post.id)

      await logPublishAttempt({
        postId: post.id,
        userId: post.user_id,
        attemptNumber: attempt,
        status: 'error',
        errorMessage: message,
        durationMs: duration,
      })

      await updatePostPublishHistory(post.id, post.user_id, attempt, 'error', { error: message })

      stats.errorCount++
      stats.attempts.push({
        postId: post.id,
        status: 'error',
        error: message,
        attempt,
      })
    }
  }

  return NextResponse.json({
    published: stats.publishedCount,
    pending_reels: stats.pendingReelsCount,
    errors: stats.errorCount,
    attempts: stats.attempts.length,
    details: stats.attempts,
  })
}
