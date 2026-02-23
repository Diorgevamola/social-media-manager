import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateVideoVeo31, VEO31_FAST_MODEL } from '@/lib/fal-video/client'
import { logAiUsage } from '@/lib/log-ai-usage'
import { z } from 'zod'

const schema = z.object({
  prompt:         z.string().min(10),
  targetDuration: z.union([
    z.literal(4),
    z.literal(6),
    z.literal(8),
  ]).default(8),
})

function toDurationStr(n: number): '4s' | '6s' | '8s' {
  if (n === 4) return '4s'
  if (n === 6) return '6s'
  return '8s'
}

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
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { prompt, targetDuration } = parsed.data
    const duration = toDurationStr(targetDuration)
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        function send(data: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          send({ type: 'start', message: `Iniciando geração VEO 3.1 via fal.ai (${duration})...` })

          const videoResult = await generateVideoVeo31(
            {
              prompt,
              duration,
              aspect_ratio: '9:16',
              resolution: '720p',
              generate_audio: true,
            },
            (message, elapsed) => send({ type: 'progress', message, elapsed }),
          )

          const videoUrl = videoResult.video.url
          if (!videoUrl) throw new Error('URL do vídeo não disponível na resposta')

          send({ type: 'progress', message: 'Baixando vídeo gerado...', elapsed: 0 })

          const videoRes = await fetch(videoUrl)
          if (!videoRes.ok) throw new Error('Falha ao baixar o vídeo gerado')

          const videoBuffer = await videoRes.arrayBuffer()
          const videoBase64 = Buffer.from(videoBuffer).toString('base64')
          const contentType = videoResult.video.content_type ?? 'video/mp4'

          logAiUsage({
            userId:          user.id,
            operationType:   'video',
            model:           VEO31_FAST_MODEL,
            generationCount: 1,
            metadata:        { targetDuration, duration, provider: 'fal.ai' },
          })

          send({
            type:      'complete',
            videoData: videoBase64,
            mimeType:  contentType,
            videoUrl,
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
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
