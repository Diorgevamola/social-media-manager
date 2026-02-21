import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'
import { z } from 'zod'

const updateSchema = z.object({
  username: z.string().min(1).max(30).optional(),
  name: z.string().max(100).nullable().optional(),
  biography: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
  target_audience: z.string().nullable().optional(),
  brand_voice: z.enum(['professional', 'casual', 'inspirational', 'educational', 'funny']).optional(),
  content_pillars: z.array(z.string()).nullable().optional(),
  posting_frequency: z.number().int().min(1).max(21).optional(),
  main_goal: z.enum(['engagement', 'growth', 'sales', 'authority']).optional(),
  strategic_notes: z.string().nullable().optional(),
  color_palette: z.array(z.string()).optional(),
  negative_words: z.array(z.string()).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { data: account, error } = await supabase
      .from('instagram_accounts')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Você já tem uma conta com esse username' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ account })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar conta'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
