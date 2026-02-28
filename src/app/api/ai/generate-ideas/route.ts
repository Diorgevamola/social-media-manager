import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContentIdeas } from '@/lib/openrouter/client'
import { logAiUsage } from '@/lib/log-ai-usage'
import { z } from 'zod'

const requestSchema = z.object({
  niche: z.string().min(1, 'Niche is required'),
  postType: z.enum(['post', 'carousel', 'reel']),
  count: z.number().min(1).max(10).optional(),
  recentTopics: z.array(z.string()).optional(),
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

    const result = await generateContentIdeas({
      niche: parsed.data.niche,
      postType: parsed.data.postType,
      count: parsed.data.count,
      recentTopics: parsed.data.recentTopics,
    })

    // Save generation history
    await supabase.from('ai_generations').insert({
      user_id: user.id,
      account_id: parsed.data.accountId ?? null,
      post_type: parsed.data.postType,
      prompt: `Ideas: ${parsed.data.niche} (${parsed.data.postType})`,
      result: result as unknown as Record<string, unknown>,
    })

    logAiUsage({
      userId: user.id,
      operationType: 'ideas',
      model: 'moonshotai/kimi-k2.5',
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate ideas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
