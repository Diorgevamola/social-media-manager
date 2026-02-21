import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { InstagramAccount, SchedulePostRow } from '@/types/database'
import type { GeneratedSchedule, ScheduleDay, SchedulePost, PostVisual, ReelScript } from '@/types/schedule'
import { ScheduleConfigurator } from '@/components/schedule/schedule-configurator'

export type MediaMap = Record<string, {
  imageUrl: string | null
  videoUrl: string | null
  postId: string
  status?: 'planned' | 'published'
  publishError?: string | null
}>

function buildScheduleFromPosts(
  posts: SchedulePostRow[],
  account: { username: string; niche: string | null; brand_voice: string; main_goal: string },
  scheduleRow: { id: string; period: number; generated_at: string },
): { schedule: GeneratedSchedule; scheduleId: string; mediaMap: MediaMap } {
  const dayMap = new Map<string, SchedulePost[]>()
  const mediaMap: MediaMap = {}

  for (const p of posts) {
    if (!dayMap.has(p.date)) dayMap.set(p.date, [])
    dayMap.get(p.date)!.push({
      type: p.post_type,
      time: p.time ?? '',
      theme: p.theme,
      caption: p.caption,
      content_pillar: p.content_pillar,
      seasonal_hook: p.seasonal_hook,
      visual: p.visual_data ? (p.visual_data as unknown as PostVisual) : undefined,
      script: p.script_data ? (p.script_data as unknown as ReelScript) : undefined,
    })

    const key = `${p.date}::${p.theme}`
    mediaMap[key] = {
      imageUrl: p.generated_image_url,
      videoUrl: p.generated_video_url,
      postId: p.id,
      status: p.status,
      publishError: p.publish_error ?? null,
    }

    // Populate per-slide keys for carousel recovery
    if (p.slide_image_urls) {
      for (const [idx, url] of Object.entries(p.slide_image_urls)) {
        mediaMap[`${key}::slide${idx}`] = {
          imageUrl: url,
          videoUrl: null,
          postId: p.id,
        }
      }
    }
  }

  const scheduleDays: ScheduleDay[] = Array.from(dayMap.entries()).map(([date, dayPosts]) => ({
    date,
    day_label: format(new Date(date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR }),
    posts: dayPosts,
  }))

  return {
    schedule: {
      schedule: scheduleDays,
      account,
      period: scheduleRow.period,
      generated_at: scheduleRow.generated_at,
    },
    scheduleId: scheduleRow.id,
    mediaMap,
  }
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Buscar contas ativas primeiro — a primeira conta define o cronograma inicial
  const { data: accounts } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .returns<InstagramAccount[]>()

  const firstAccount = (accounts ?? [])[0]

  let initialSchedule: GeneratedSchedule | null = null
  let initialScheduleId: string | null = null
  const initialAccountId: string | null = firstAccount?.id ?? null
  let initialMediaMap: MediaMap = {}

  if (firstAccount) {
    // 2. Buscar o cronograma mais recente DESTA conta específica
    const { data: latestSchedule } = await supabase
      .from('schedules')
      .select('id, account_id, period, generated_at')
      .eq('user_id', user!.id)
      .eq('account_id', firstAccount.id)   // ← filtro por conta
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (latestSchedule) {
      const { data: posts } = await supabase
        .from('schedule_posts')
        .select('*')
        .eq('schedule_id', latestSchedule.id)
        .order('date', { ascending: true })
        .returns<SchedulePostRow[]>()

      if (posts && posts.length > 0) {
        const built = buildScheduleFromPosts(
          posts,
          {
            username: firstAccount.username,
            niche: firstAccount.niche ?? null,
            brand_voice: firstAccount.brand_voice,
            main_goal: firstAccount.main_goal,
          },
          {
            id: latestSchedule.id,
            period: latestSchedule.period,
            generated_at: latestSchedule.generated_at,
          },
        )
        initialSchedule = built.schedule
        initialScheduleId = built.scheduleId
        initialMediaMap = built.mediaMap
      }
    }
  }

  return (
    <ScheduleConfigurator
      accounts={accounts ?? []}
      initialAccountId={initialAccountId}
      initialSchedule={initialSchedule}
      initialScheduleId={initialScheduleId}
      initialMediaMap={initialMediaMap}
    />
  )
}
