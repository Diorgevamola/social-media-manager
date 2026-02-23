import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const BUCKET = 'schedule-media'

const schema = z.object({
  postId: z.string().uuid(),
  mediaType: z.enum(['image', 'video']),
  data: z.string(), // base64
  mimeType: z.enum(['image/png', 'image/jpeg', 'video/mp4']),
  slideIndex: z.number().int().min(0).optional(), // carousel slide
  sceneIndex: z.number().int().min(0).optional(), // reel scene
})

/**
 * Ensures the storage bucket exists and is public.
 * Safe to call repeatedly — idempotent.
 * Calls updateBucket after create to fix cases where the bucket existed as private.
 */
async function ensureBucket() {
  const service = createServiceClient()
  const opts = { public: true, fileSizeLimit: 52428800 } // 50 MB
  await service.storage.createBucket(BUCKET, opts)   // no-op if already exists
  await service.storage.updateBucket(BUCKET, opts)   // garante public=true mesmo se criado privado
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { postId, mediaType, data, mimeType, slideIndex, sceneIndex } = parsed.data

    // Verify ownership
    const { data: post, error: postError } = await supabase
      .from('schedule_posts')
      .select('id, user_id, slide_image_urls')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    const ext = mimeType === 'video/mp4' ? 'mp4' : mimeType === 'image/jpeg' ? 'jpg' : 'png'

    // Carousel slides and reel scenes use separate paths
    const isSlide = slideIndex !== undefined
    const isScene = sceneIndex !== undefined
    const storagePath = isScene
      ? `${user.id}/${postId}-scene${sceneIndex}.${ext}`
      : isSlide
        ? `${user.id}/${postId}-slide${slideIndex}.${ext}`
        : `${user.id}/${postId}.${ext}`

    // Convert base64 to buffer
    const buffer = Buffer.from(data, 'base64')

    // Ensure bucket exists (auto-creates if missing; idempotent)
    await ensureBucket()

    // Use service role for storage operations — ownership already verified above
    const service = createServiceClient()

    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Erro ao fazer upload: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = service.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    let updateError
    if (isScene) {
      // Merge scene video URL into slide_image_urls JSONB with "sceneN" keys
      const current = (post.slide_image_urls as Record<string, string> | null) ?? {}
      const updated = { ...current, [`scene${sceneIndex}`]: publicUrl }
      ;({ error: updateError } = await supabase
        .from('schedule_posts')
        .update({ slide_image_urls: updated })
        .eq('id', postId))
    } else if (isSlide) {
      // Merge slide URL into slide_image_urls JSONB
      const current = (post.slide_image_urls as Record<string, string> | null) ?? {}
      const updated = { ...current, [slideIndex.toString()]: publicUrl }
      ;({ error: updateError } = await supabase
        .from('schedule_posts')
        .update({ slide_image_urls: updated })
        .eq('id', postId))

      // Slide 0 also updates the main generated_image_url (for backward compat / thumbnail)
      if (slideIndex === 0 && mediaType === 'image') {
        await supabase
          .from('schedule_posts')
          .update({ generated_image_url: publicUrl })
          .eq('id', postId)
      }
    } else {
      const updateField = mediaType === 'image'
        ? { generated_image_url: publicUrl }
        : { generated_video_url: publicUrl }
      ;({ error: updateError } = await supabase
        .from('schedule_posts')
        .update(updateField)
        .eq('id', postId))
    }

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar post' }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
