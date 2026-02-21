import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface AuthResult {
  userId: string
  supabase: SupabaseClient<Database>
}

/** Extracts the raw API key from request headers. */
export function extractApiKey(request: Request): string | null {
  // Header: X-API-Key: smm_...
  const apiKey = request.headers.get('x-api-key')
  if (apiKey?.startsWith('smm_')) return apiKey

  // Header: Authorization: Bearer smm_...
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer smm_')) return auth.slice(7)

  return null
}

/** SHA-256 hash of the raw key (stored in DB, never the raw key). */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Authenticates a request via Supabase session OR API key.
 *
 * - Session auth: returns the normal SSR client
 * - API key auth: returns the service-role client (RLS bypassed)
 *   All routes MUST filter queries with `.eq('user_id', userId)`.
 *
 * Returns null if neither method succeeds.
 */
export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
  // 1. Try session auth (cookie-based)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return { userId: user.id, supabase }
  }

  // 2. Try API key auth
  const rawKey = extractApiKey(request)
  if (!rawKey) return null

  const keyHash = hashApiKey(rawKey)
  const service = createServiceClient()

  const { data: apiKey } = await service
    .from('api_keys')
    .select('user_id, revoked_at, expires_at')
    .eq('key_hash', keyHash)
    .single()

  if (!apiKey) return null
  if (apiKey.revoked_at) return null
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) return null

  // Update last_used_at (fire and forget — don't block the request)
  void service
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash)

  return { userId: apiKey.user_id, supabase: service }
}
