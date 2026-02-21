import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'
import { z } from 'zod'
import type { ScheduleDay } from '@/types/schedule'

const schema = z.object({
  accountId: z.string().uuid(),
  period: z.number().int(),
  generated_at: z.string(),
  schedule: z.array(z.unknown()),
})

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { accountId, period, generated_at, schedule } = parsed.data

    // Insert schedule header
    const { data: savedSchedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        user_id: userId,
        account_id: accountId,
        period: period as 7 | 15 | 30,
        generated_at,
      })
      .select('id')
      .single()

    if (scheduleError || !savedSchedule) {
      return NextResponse.json({ error: 'Erro ao salvar cronograma' }, { status: 500 })
    }

    const scheduleId = savedSchedule.id

    // Flatten all posts from all days
    const postsToInsert = (schedule as ScheduleDay[]).flatMap(day =>
      day.posts.map(post => ({
        schedule_id: scheduleId,
        user_id: userId,
        date: day.date,
        post_type: post.type,
        time: post.time ?? null,
        theme: post.theme,
        caption: post.caption ?? null,
        content_pillar: post.content_pillar ?? null,
        seasonal_hook: post.seasonal_hook ?? null,
        visual_data: post.visual ? (post.visual as unknown as Record<string, unknown>) : null,
        script_data: post.script ? (post.script as unknown as Record<string, unknown>) : null,
      }))
    )

    const { data: savedPosts, error: postsError } = await supabase
      .from('schedule_posts')
      .insert(postsToInsert)
      .select('id, date, post_type, theme')

    if (postsError) {
      // Roll back schedule header
      await supabase.from('schedules').delete().eq('id', scheduleId)
      return NextResponse.json({ error: 'Erro ao salvar posts do cronograma' }, { status: 500 })
    }

    return NextResponse.json({ scheduleId, postsCount: savedPosts?.length ?? 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
