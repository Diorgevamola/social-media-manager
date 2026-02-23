import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SchedulePostRow } from '@/types/database'
import type { GeneratedSchedule, ScheduleDay, SchedulePost, PostVisual, ReelScript } from '@/types/schedule'
import type { MediaMap } from '@/app/dashboard/schedule/page'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 })
    }

    const authResult = await authenticateRequest(request)
    if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = authResult

    // Fetch latest schedule for this account
    const { data: latestSchedule } = await supabase
      .from('schedules')
      .select('id, account_id, period, generated_at')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!latestSchedule) {
      return NextResponse.json({ schedule: null, scheduleId: null, mediaMap: {} })
    }

    // Fetch account info
    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('username, niche, brand_voice, main_goal')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single()

    if (!account) {
      return NextResponse.json({ schedule: null, scheduleId: null, mediaMap: {} })
    }

    // Fetch posts
    const { data: posts } = await supabase
      .from('schedule_posts')
      .select('*')
      .eq('schedule_id', latestSchedule.id)
      .order('date', { ascending: true })
      .returns<SchedulePostRow[]>()

    const mediaMap: MediaMap = {}
    const dayMap = new Map<string, SchedulePost[]>()

    for (const p of posts ?? []) {
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
        confirmed: p.confirmed ?? false,
        status: p.status,
      }

      // Populate per-slide and per-scene keys for recovery
      if (p.slide_image_urls) {
        for (const [slKey, url] of Object.entries(p.slide_image_urls)) {
          if (slKey.startsWith('scene')) {
            // Reel scene video (stored with "sceneN" keys)
            mediaMap[`${key}::${slKey}`] = {
              imageUrl: null,
              videoUrl: url,
              postId: p.id,
            }
          } else {
            // Carousel slide (numeric keys "0", "1", etc.)
            mediaMap[`${key}::slide${slKey}`] = {
              imageUrl: url,
              videoUrl: null,
              postId: p.id,
            }
          }
        }
      }
    }

    const scheduleDays: ScheduleDay[] = Array.from(dayMap.entries()).map(([date, dayPosts]) => ({
      date,
      day_label: format(new Date(date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR }),
      posts: dayPosts,
    }))

    const schedule: GeneratedSchedule = {
      schedule: scheduleDays,
      account: {
        username: account.username,
        niche: account.niche ?? null,
        brand_voice: account.brand_voice,
        main_goal: account.main_goal,
      },
      period: latestSchedule.period,
      generated_at: latestSchedule.generated_at,
    }

    return NextResponse.json({ schedule, scheduleId: latestSchedule.id, mediaMap })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
