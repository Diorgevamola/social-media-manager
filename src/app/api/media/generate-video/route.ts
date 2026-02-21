import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { logAiUsage } from '@/lib/log-ai-usage'
import { z } from 'zod'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const schema = z.object({
  prompt: z.string().min(10),
})

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

    const { prompt } = parsed.data
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        function send(data: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          send({ type: 'start', message: 'Iniciando geração do vídeo com VEO 3.1...' })

          let operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt,
            config: { numberOfVideos: 1, aspectRatio: '9:16' },
          })

          // Poll every 10s, max 6 minutes
          let attempts = 0
          const maxAttempts = 36

          while (!operation.done && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000))
            attempts++
            operation = await ai.operations.get({ operation })
            send({
              type: 'progress',
              message: `Processando vídeo... ${attempts * 10}s`,
              elapsed: attempts * 10,
            })
          }

          if (!operation.done) {
            throw new Error('Tempo limite atingido. O vídeo pode estar sendo processado — tente novamente em alguns minutos.')
          }

          const videos = operation.response?.generatedVideos
          if (!videos?.length) throw new Error('Nenhum vídeo gerado')

          const videoUri = videos[0]?.video?.uri
          if (!videoUri) throw new Error('URI do vídeo não disponível')

          // Proxy the video bytes from Google's Files API
          const apiKey = process.env.GEMINI_API_KEY!
          const downloadUrl = videoUri.includes('?')
            ? `${videoUri}&key=${apiKey}`
            : `${videoUri}?key=${apiKey}`

          const videoRes = await fetch(downloadUrl)
          if (!videoRes.ok) throw new Error('Falha ao baixar o vídeo gerado')

          const videoBuffer = await videoRes.arrayBuffer()
          const videoBase64 = Buffer.from(videoBuffer).toString('base64')

          logAiUsage({
            userId: user.id,
            operationType: 'video',
            model: 'veo-3.1-generate-preview',
            generationCount: 1,
          })

          send({
            type: 'complete',
            videoData: videoBase64,
            mimeType: 'video/mp4',
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
