import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCaptions, type CaptionRequest } from '@/lib/gemini-server'
import { logAiUsage } from '@/lib/log-ai-usage'
import { z } from 'zod'

const requestSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  tone: z.enum(['professional', 'casual', 'funny', 'inspirational', 'educational']),
  postType: z.enum(['post', 'carousel', 'reel']),
  niche: z.string().min(1, 'Niche is required'),
  language: z.string().optional(),
  additionalContext: z.string().optional(),
  accountId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const captionRequest: CaptionRequest = {
      topic: parsed.data.topic,
      tone: parsed.data.tone,
      postType: parsed.data.postType,
      niche: parsed.data.niche,
      language: parsed.data.language,
      additionalContext: parsed.data.additionalContext,
    }

    const result = await generateCaptions(captionRequest)

    // Save generation history
    await supabase.from('ai_generations').insert({
      user_id: user.id,
      account_id: parsed.data.accountId ?? null,
      post_type: parsed.data.postType,
      prompt: `Caption: ${parsed.data.topic} (${parsed.data.tone})`,
      result: result as unknown as Record<string, unknown>,
    })

    logAiUsage({
      userId: user.id,
      operationType: 'caption',
      model: 'gemini-1.5-flash',
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate caption'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
