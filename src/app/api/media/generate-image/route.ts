import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { logAiUsage } from '@/lib/log-ai-usage'
import { z } from 'zod'

export const maxDuration = 60 // segundos — evita timeout silencioso do Next.js

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const schema = z.object({
  prompt: z.string().min(10),
  aspectRatio: z.enum(['1:1', '4:5', '9:16']).default('1:1'),
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
    // Nota: aspectRatio não é suportado por generateContent (apenas generateImages/Imagen).
    // O gemini-3.1-flash-image-preview usa generateContent com responseModalities.

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
      },
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p.inlineData?.data) as { inlineData: { data: string; mimeType: string } } | undefined

    if (!imagePart?.inlineData) {
      console.error('[generate-image] Sem imagem na resposta. Parts:', JSON.stringify(parts))
      throw new Error('Nenhuma imagem gerada')
    }

    logAiUsage({
      userId: user.id,
      operationType: 'image',
      model: 'gemini-3.1-flash-image-preview',
      generationCount: 1,
    })

    return NextResponse.json({
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? 'image/jpeg',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem'
    console.error('[generate-image] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
