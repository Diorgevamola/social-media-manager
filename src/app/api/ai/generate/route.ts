import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInstagramContent } from '@/lib/gemini/client'
import { logAiUsage } from '@/lib/log-ai-usage'
import { z } from 'zod'

const schema = z.object({
  postType: z.enum(['post', 'carousel', 'reel']),
  topic: z.string().min(3),
  niche: z.string().min(2),
  tone: z.string().optional(),
  additionalContext: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { postType, topic, niche, tone, additionalContext } = parsed.data

  const content = await generateInstagramContent({
    postType,
    topic,
    niche,
    tone,
    additionalContext,
    language: 'português',
  })

  // Save to history (type assertion needed for Json compatibility)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('ai_generations') as any).insert({
    user_id: user.id,
    post_type: postType,
    prompt: `${topic} | ${niche} | ${tone}`,
    result: content,
  })

  logAiUsage({
    userId: user.id,
    operationType: 'text',
    model: 'gemini-1.5-flash',
  })

  return NextResponse.json(content)
}
