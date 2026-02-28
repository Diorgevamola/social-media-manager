import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAiUsage } from '@/lib/log-ai-usage'
import { generateVideoFromText, generateVideoFromImage, SEEDANCE_T2V_MODEL } from '@/lib/seedance/client'
import type { SeedanceAspectRatio, SeedanceResolution } from '@/lib/seedance/client'
import { z } from 'zod'

const schema = z.object({
  prompt:       z.string().min(10),
  image_url:    z.string().url().optional(),       // se fornecida → image-to-video
  aspect_ratio: z.enum(['16:9', '9:16', '4:3', '3:4', '1:1', '21:9']).default('9:16'),
  resolution:   z.enum(['480p', '720p', '1080p']).default('1080p'),
  duration:     z.number().int().min(2).max(12).default(5),
  audio:        z.boolean().default(false),
  camera_fixed: z.boolean().default(false),
  seed:         z.number().int().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL_KEY não configurada. Adicione ao .env.local.' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { prompt, image_url, aspect_ratio, resolution, duration, audio, camera_fixed, seed } = parsed.data
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        function send(data: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          const modelLabel = `Seedance 2.0${image_url ? ' (imagem→vídeo)' : ''}`
          send({ type: 'start', message: `Iniciando geração com ${modelLabel}...` })

          const input = {
            prompt,
            aspect_ratio: aspect_ratio as SeedanceAspectRatio,
            resolution:   resolution  as SeedanceResolution,
            duration,
            audio,
            camera_fixed,
            ...(seed !== undefined && { seed }),
          }

          const videoResult = image_url
            ? await generateVideoFromImage(
                { ...input, image_url },
                (message, elapsed) => send({ type: 'progress', message, elapsed }),
              )
            : await generateVideoFromText(
                input,
                (message, elapsed) => send({ type: 'progress', message, elapsed }),
              )

          const videoUrl = videoResult.video.url
          if (!videoUrl) throw new Error('URL do vídeo não disponível na resposta')

          // Baixa o vídeo para base64 (mesmo padrão da rota Veo)
          const videoRes = await fetch(videoUrl)
          if (!videoRes.ok) throw new Error('Falha ao baixar o vídeo gerado')

          const videoBuffer  = await videoRes.arrayBuffer()
          const videoBase64  = Buffer.from(videoBuffer).toString('base64')
          const contentType  = videoResult.video.content_type ?? 'video/mp4'

          logAiUsage({
            userId:        user.id,
            operationType: 'video',
            model:         SEEDANCE_T2V_MODEL,
            generationCount: 1,
            metadata: { aspect_ratio, resolution, duration, audio, has_image: !!image_url },
          })

          send({
            type:      'complete',
            videoData: videoBase64,
            mimeType:  contentType,
            videoUrl,             // URL direta (útil para publicação no Instagram)
            seed:      videoResult.seed,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao gerar vídeo'
          send({ type: 'error', message })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':     'text/event-stream',
        'Cache-Control':    'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
