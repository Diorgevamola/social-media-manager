import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashApiKey } from '@/lib/api-key-auth'
import { z } from 'zod'
import crypto from 'crypto'

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  expires_at: z.string().datetime().nullable().optional(),
})

/** GET /api/keys — list all API keys for the authenticated user */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, prefix, last_used_at, expires_at, created_at, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ keys })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** POST /api/keys — create a new API key (returns the raw key ONCE) */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = createKeySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    // Generate raw key: smm_ + 32 random hex chars
    const rawKey = 'smm_' + crypto.randomBytes(16).toString('hex')
    const prefix = rawKey.slice(0, 12)    // "smm_" + first 8 chars
    const keyHash = hashApiKey(rawKey)

    const { data: key, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        prefix,
        key_hash: keyHash,
        expires_at: parsed.data.expires_at ?? null,
      })
      .select('id, name, prefix, created_at, expires_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Return the raw key ONLY on creation — it won't be shown again
    return NextResponse.json({ key, rawKey }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
