import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (auth instanceof Response) return auth

  const db = createServiceClient()

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const users = authData?.users ?? []
  if (!users.length) return NextResponse.json([])

  const userIds = users.map((u) => u.id)

  const [
    { data: profiles },
    { data: accounts },
    { data: schedules },
    { data: posts },
    { data: images },
    { data: videos },
  ] = await Promise.all([
    db.from('profiles').select('id, full_name').in('id', userIds),
    db.from('instagram_accounts').select('user_id').in('user_id', userIds),
    db.from('schedules').select('user_id').in('user_id', userIds),
    db.from('schedule_posts').select('user_id').in('user_id', userIds),
    db.from('schedule_posts').select('user_id').in('user_id', userIds).not('generated_image_url', 'is', null),
    db.from('schedule_posts').select('user_id').in('user_id', userIds).not('generated_video_url', 'is', null),
  ])

  const count = (arr: Array<{ user_id: string }> | null, userId: string) =>
    (arr ?? []).filter((r) => r.user_id === userId).length

  const result = users.map((u) => {
    const profile = (profiles ?? []).find((p) => p.id === u.id)
    return {
      id:                 u.id,
      email:              u.email ?? '—',
      created_at:         u.created_at,
      full_name:          profile?.full_name ?? null,
      instagram_accounts: count(accounts, u.id),
      schedules:          count(schedules, u.id),
      schedule_posts:     count(posts, u.id),
      images:             count(images, u.id),
      videos:             count(videos, u.id),
    }
  })

  return NextResponse.json(result)
}
