import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('scheduleId')
    const date = searchParams.get('date')
    const theme = searchParams.get('theme')

    if (!scheduleId || !date || !theme) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('schedule_posts')
      .select('id')
      .eq('schedule_id', scheduleId)
      .eq('user_id', user.id)
      .eq('date', date)
      .eq('theme', theme)
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json({ postId: null })
    }

    return NextResponse.json({ postId: data.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
