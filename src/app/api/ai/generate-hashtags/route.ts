import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHashtags } from '@/lib/gemini-server'
import { logAiUsage } from '@/lib/log-ai-usage'
import { z } from 'zod'

const requestSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  niche: z.string().min(1, 'Niche is required'),
  count: z.number().min(5).max(50).optional(),
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

    const result = await generateHashtags({
      topic: parsed.data.topic,
      niche: parsed.data.niche,
      count: parsed.data.count,
    })

    // Save generation history
    await supabase.from('ai_generations').insert({
      user_id: user.id,
      account_id: parsed.data.accountId ?? null,
      post_type: null,
      prompt: `Hashtags: ${parsed.data.topic} (${parsed.data.niche})`,
      result: result as unknown as Record<string, unknown>,
    })

    logAiUsage({
      userId: user.id,
      operationType: 'hashtags',
      model: 'gemini-1.5-flash',
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate hashtags'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
