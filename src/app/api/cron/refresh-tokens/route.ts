import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { decryptToken, encryptToken } from '@/lib/token-crypto'

export const maxDuration = 60

interface RefreshResponse {
  access_token: string
  token_type: string
  expires_in: number
}

async function refreshInstagramToken(plainToken: string): Promise<RefreshResponse> {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${plainToken}`,
    { cache: 'no-store' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message ?? `Refresh falhou com status ${res.status}`)
  }
  return res.json() as Promise<RefreshResponse>
}

async function fetchProfilePicture(igUserId: string, plainToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${igUserId}?fields=profile_picture_url&access_token=${plainToken}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return null
    const data = await res.json() as { profile_picture_url?: string }
    return data.profile_picture_url ?? null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret =
    searchParams.get('secret') ??
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Busca contas com token expirando em até 30 dias (ou já expirado)
  const threshold = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: accounts, error } = await supabase
    .from('instagram_accounts')
    .select('id, ig_user_id, access_token, token_expires_at')
    .not('access_token', 'is', null)
    .not('ig_user_id', 'is', null)
    .lt('token_expires_at', threshold)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = { refreshed: 0, failed: 0, errors: [] as string[] }

  for (const account of accounts ?? []) {
    try {
      const plainToken = decryptToken(account.access_token!)
      const { access_token: newToken, expires_in } = await refreshInstagramToken(plainToken)

      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()
      const profilePictureUrl = await fetchProfilePicture(account.ig_user_id!, newToken)

      await supabase
        .from('instagram_accounts')
        .update({
          access_token: encryptToken(newToken),
          token_expires_at: tokenExpiresAt,
          ...(profilePictureUrl ? { profile_picture_url: profilePictureUrl } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id)

      results.refreshed++
    } catch (err) {
      results.failed++
      results.errors.push(
        `[${account.id}] ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      )
    }
  }

  return NextResponse.json(results)
}
