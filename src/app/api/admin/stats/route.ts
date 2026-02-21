import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (auth instanceof Response) return auth

  const db = createServiceClient()

  const [
    { count: totalUsers },
    { count: totalSchedules },
    { count: totalPosts },
    { count: totalImages },
    { count: totalVideos },
    { count: totalTextGenerations },
    costResult,
    recentUsersResult,
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('schedules').select('*', { count: 'exact', head: true }),
    db.from('schedule_posts').select('*', { count: 'exact', head: true }),
    db.from('schedule_posts').select('*', { count: 'exact', head: true }).not('generated_image_url', 'is', null),
    db.from('schedule_posts').select('*', { count: 'exact', head: true }).not('generated_video_url', 'is', null),
    db.from('ai_generations').select('*', { count: 'exact', head: true }),
    db.from('ai_usage_logs').select('cost_usd'),
    db.from('profiles').select('*', { count: 'exact', head: true }).gte(
      'created_at',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    ),
  ])

  const accurateCostUsd = (costResult.data ?? []).reduce(
    (sum: number, row: { cost_usd: string | number | null }) => sum + Number(row.cost_usd ?? 0),
    0,
  )

  return NextResponse.json({
    totalUsers:           totalUsers ?? 0,
    totalSchedules:       totalSchedules ?? 0,
    totalPosts:           totalPosts ?? 0,
    totalImages:          totalImages ?? 0,
    totalVideos:          totalVideos ?? 0,
    totalTextGenerations: totalTextGenerations ?? 0,
    accurateCostUsd,
    recentUsers:          recentUsersResult.count ?? 0,
  })
}
