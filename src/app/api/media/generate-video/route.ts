import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { logAiUsage } from '@/lib/log-ai-usage'
import { z } from 'zod'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const schema = z.object({
  prompt:         z.string().min(10),
  targetDuration: z.union([
    z.literal(4),
    z.literal(6),
    z.literal(8),
    z.literal(15),   // 8s base + 1 extensão (~7s) = ~15s
    z.literal(22),   // 8s base + 2 extensões     = ~22s
    z.literal(30),   // 8s base + 3 extensões     = ~29s
  ]).default(8),
})

// Quantas extensões de 7s são necessárias para atingir targetDuration
function calcExtensions(target: number): { baseSeconds: number; extensionCount: number } {
  if (target <= 8) return { baseSeconds: target, extensionCount: 0 }
  return { baseSeconds: 8, extensionCount: Math.round((target - 8) / 7) }
}

// Aguarda operação concluir com polling de 10s
async function pollOperation(
  operation: Awaited<ReturnType<typeof ai.models.generateVideos>>,
  send: (data: object) => void,
  label: string,
  maxSeconds = 180,
) {
  let attempts = 0
  const maxAttempts = Math.ceil(maxSeconds / 10)

  while (!operation.done && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000))
    attempts++
    operation = await ai.operations.get({ operation })
    send({ type: 'progress', message: `${label}... ${attempts * 10}s`, elapsed: attempts * 10 })
  }

  if (!operation.done) {
    throw new Error('Tempo limite atingido. O vídeo pode ainda estar sendo processado — tente novamente.')
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri
  if (!videoUri) throw new Error('URI do vídeo não disponível')

  return videoUri
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

    const { prompt, targetDuration } = parsed.data
    const { baseSeconds, extensionCount } = calcExtensions(targetDuration)
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        function send(data: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          // ── Geração base ────────────────────────────────────────────
          const totalLabel = extensionCount > 0
            ? `~${targetDuration}s (${1 + extensionCount} gerações)`
            : `${baseSeconds}s`

          send({ type: 'start', message: `Iniciando geração VEO 3.1 (${totalLabel})...` })

          const baseOp = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt,
            config: { numberOfVideos: 1, aspectRatio: '9:16', durationSeconds: baseSeconds },
          })

          let currentUri = await pollOperation(baseOp, send, 'Processando clipe base', 180)

          // ── Extensões ───────────────────────────────────────────────
          for (let i = 0; i < extensionCount; i++) {
            const step = i + 1
            send({
              type: 'progress',
              message: `Estendendo vídeo (parte ${step + 1}/${1 + extensionCount})...`,
              elapsed: 0,
            })

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extOp = await (ai.models.generateVideos as any)({
              model: 'veo-3.1-generate-preview',
              prompt,
              video: { uri: currentUri, mimeType: 'video/mp4' },
              config: { numberOfVideos: 1, aspectRatio: '9:16', durationSeconds: 8, resolution: '720p' },
            })

            currentUri = await pollOperation(
              extOp,
              send,
              `Processando extensão ${step}/${extensionCount}`,
              180,
            )
          }

          // ── Download do vídeo final ─────────────────────────────────
          send({ type: 'progress', message: 'Baixando vídeo final...', elapsed: 0 })

          const apiKey = process.env.GEMINI_API_KEY!
          const downloadUrl = currentUri.includes('?')
            ? `${currentUri}&key=${apiKey}`
            : `${currentUri}?key=${apiKey}`

          const videoRes = await fetch(downloadUrl)
          if (!videoRes.ok) throw new Error('Falha ao baixar o vídeo gerado')

          const videoBuffer = await videoRes.arrayBuffer()
          const videoBase64  = Buffer.from(videoBuffer).toString('base64')

          logAiUsage({
            userId:          user.id,
            operationType:   'video',
            model:           'veo-3.1-generate-preview',
            generationCount: 1 + extensionCount,
            metadata:        { targetDuration, baseSeconds, extensionCount },
          })

          send({ type: 'complete', videoData: videoBase64, mimeType: 'video/mp4' })
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
