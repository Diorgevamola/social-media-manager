import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAiUsage } from '@/lib/log-ai-usage'
import { generateVideoWithSeedance, isXSkillConfigured, type AspectRatio, type Resolution } from '@/lib/xskill/client'
import { z } from 'zod'

const schema = z.object({
  prompt: z.string().min(10, 'Prompt deve ter pelo menos 10 caracteres'),
  image_url: z.string().url().optional(),
  aspect_ratio: z.enum(['16:9', '9:16', '4:3', '3:4', '1:1', '21:9']).default('9:16'),
  resolution: z.enum(['480p', '720p', '1080p', '2K']).default('1080p'),
  duration: z.number().int().min(4).max(15).default(5),
  audio: z.boolean().default(true),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verificar se API está configurada
    if (!isXSkillConfigured()) {
      return NextResponse.json(
        {
          error: 'XSKILL_API_KEY não configurada. Adicione ao .env.local.',
          hint: 'Obtenha uma chave em https://xskill.ai',
        },
        { status: 503 },
      )
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { prompt, image_url, aspect_ratio, resolution, duration, audio } = parsed.data
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        function send(data: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          const modelLabel = `Seedance 2.0${image_url ? ' (imagem→vídeo)' : ' (texto→vídeo)'}`
          send({ type: 'start', message: `Iniciando geração com ${modelLabel}...` })

          const videoResult = await generateVideoWithSeedance(
            {
              prompt,
              aspect_ratio: aspect_ratio as AspectRatio,
              resolution: resolution as Resolution,
              duration,
              audio,
              image_url,
            },
            (message, elapsed) => send({ type: 'progress', message, elapsed }),
          )

          const videoUrl = videoResult.video_url
          if (!videoUrl && !videoResult.video_data) {
            throw new Error('URL do vídeo não disponível na resposta')
          }

          // Log usage
          logAiUsage({
            userId: user.id,
            operationType: 'video',
            model: 'seedance-2.0',
            generationCount: 1,
            metadata: {
              aspect_ratio,
              resolution,
              duration,
              audio,
              has_image: !!image_url,
              provider: 'xskill-ai',
            },
          })

          send({
            type: 'complete',
            videoData: videoResult.video_data,
            mimeType: 'video/mp4',
            videoUrl,
            taskId: videoResult.task_id,
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
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
