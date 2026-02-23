import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'
import { generateInstagramContent } from '@/lib/gemini/client'

const STORAGE_BUCKET = 'schedule-media'

function extractStoragePath(url: string): string | null {
  try {
    const marker = `/object/public/${STORAGE_BUCKET}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return url.slice(idx + marker.length)
  } catch {
    return null
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params

    // Fetch post with media URLs and account briefing
    const { data: post, error: postError } = await supabase
      .from('schedule_posts')
      .select(`
        id,
        theme,
        post_type,
        generated_image_url,
        generated_video_url,
        schedules!inner(
          instagram_accounts!inner(
            niche,
            brand_voice,
            target_audience,
            content_pillars
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    // Delete media files from storage (best-effort)
    const pathsToDelete: string[] = []
    if (post.generated_image_url) {
      const p = extractStoragePath(post.generated_image_url)
      if (p) pathsToDelete.push(p)
    }
    if (post.generated_video_url) {
      const p = extractStoragePath(post.generated_video_url)
      if (p) pathsToDelete.push(p)
    }
    if (pathsToDelete.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(pathsToDelete)
    }

    // Get account briefing for Gemini
    const schedule = (post.schedules as unknown as {
      instagram_accounts: {
        niche: string | null
        brand_voice: string | null
        target_audience: string | null
        content_pillars: string[] | null
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

    // Update post: clear media URLs and set new caption
    const { error: updateError } = await supabase
      .from('schedule_posts')
      .update({
        caption: generated.caption,
        generated_image_url: null,
        generated_video_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ caption: generated.caption })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao refazer post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
