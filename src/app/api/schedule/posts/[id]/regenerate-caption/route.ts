import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'
import { generateInstagramContent } from '@/lib/gemini/client'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params

    // Fetch post with schedule → account briefing
    const { data: post, error: postError } = await supabase
      .from('schedule_posts')
      .select(`
        id,
        theme,
        post_type,
        caption,
        schedule_id,
        schedules!inner(
          account_id,
          instagram_accounts!inner(
            niche,
            brand_voice,
            target_audience,
            content_pillars,
            user_id
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    const schedule = (post.schedules as unknown as {
      account_id: string
      instagram_accounts: {
        niche: string | null
        brand_voice: string | null
        target_audience: string | null
        content_pillars: string[] | null
        user_id: string
      }
    })

    const account = schedule.instagram_accounts

    const niche = account.niche ?? 'geral'
    const tone = account.brand_voice ?? 'profissional e engajador'
    const additionalContext = [
      account.target_audience ? `Público-alvo: ${account.target_audience}` : '',
      account.content_pillars?.length ? `Pilares de conteúdo: ${account.content_pillars.join(', ')}` : '',
    ].filter(Boolean).join('. ')

    const generated = await generateInstagramContent({
      postType: (['post', 'reel', 'carousel'] as const).includes(post.post_type as 'post' | 'reel' | 'carousel')
        ? post.post_type as 'post' | 'reel' | 'carousel'
        : 'post',
      topic: post.theme,
      tone,
      niche,
      language: 'português',
      additionalContext: additionalContext || undefined,
    })

    const newCaption = generated.caption

    // Save the new caption to the DB
    const { error: updateError } = await supabase
      .from('schedule_posts')
      .update({ caption: newCaption, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ caption: newCaption })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao regenerar legenda'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
