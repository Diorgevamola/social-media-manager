import type { IGAccount, IGMedia } from '@/types/instagram'

const IG_API_VERSION = 'v21.0'
const IG_BASE_URL = `https://graph.facebook.com/${IG_API_VERSION}`

export class InstagramClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${IG_BASE_URL}${endpoint}`)
    url.searchParams.set('access_token', this.accessToken)
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
    }

    const res = await fetch(url.toString())
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error?.message || 'Instagram API error')
    }
    return res.json()
  }

  async getAccount(igUserId: string): Promise<IGAccount> {
    return this.fetch<IGAccount>(`/${igUserId}`, {
      fields: 'id,username,name,profile_picture_url,followers_count,following_count,media_count,biography,website,account_type',
    })
  }

  async getMedia(igUserId: string, limit = 12): Promise<{ data: IGMedia[] }> {
    return this.fetch<{ data: IGMedia[] }>(`/${igUserId}/media`, {
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit: limit.toString(),
    })
  }

  async getMediaInsights(mediaId: string): Promise<{ data: Array<{ name: string; values: Array<{ value: number }> }> }> {
    return this.fetch(`/${mediaId}/insights`, {
      metric: 'impressions,reach,likes,comments,shares,saves,engagement',
    })
  }
}

// ── Instagram Platform API with Instagram Login (julho 2024) ──────────────────
// Fluxo direto Instagram — sem Facebook Login, sem Páginas do Facebook.
// Qualquer conta Business/Creator pode conectar após Advanced Access aprovado.

export function getInstagramOAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    scope: [
      'instagram_business_basic',
      'instagram_business_content_publish',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
    ].join(','),
    response_type: 'code',
  })

  if (state) params.set('state', state)

  // Endpoint do Instagram Business Login (novo) — www.instagram.com, não api.instagram.com
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  access_token: string
  user_id: number
}> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  })

  // DEBUG — remover após diagnóstico
  console.error('[IG-EXCHANGE] body params:', Object.fromEntries(body))

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body,
  })

  const rawText = await res.text()
  // DEBUG — remover após diagnóstico
  console.error('[IG-EXCHANGE] status:', res.status, 'response:', rawText)

  if (!res.ok) {
    let error: Record<string, unknown> = {}
    try { error = JSON.parse(rawText) } catch { /* ignore */ }
    throw Object.assign(
      new Error(String(error.error_message || error.error || rawText || 'Token exchange failed')),
      { igRawResponse: rawText, igStatus: res.status },
    )
  }

  return JSON.parse(rawText)
}

export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortLivedToken,
  })

  const res = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`,
  )

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Long-lived token exchange failed')
  }

  return res.json()
}

export async function getInstagramUserProfile(longLivedToken: string): Promise<{
  user_id: string
  username: string
}> {
  const res = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${longLivedToken}`,
  )

  if (!res.ok) {
    throw new Error('Failed to get Instagram user profile')
  }

  const data = await res.json() as { user_id: string; username: string }
  return data
}
