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

export function getInstagramOAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    scope: [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
      'business_management',
    ].join(','),
    response_type: 'code',
  })

  if (state) params.set('state', state)

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  access_token: string
  token_type: string
}> {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  })

  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`,
  )

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Token exchange failed')
  }

  return res.json()
}

export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  })

  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`,
  )

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Long-lived token exchange failed')
  }

  return res.json()
}

export async function getInstagramBusinessAccount(
  pageAccessToken: string,
  pageId: string,
): Promise<{ instagram_business_account?: { id: string } }> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`,
  )

  if (!res.ok) {
    throw new Error('Failed to get Instagram business account')
  }

  return res.json()
}

export async function getUserPages(userAccessToken: string): Promise<{
  data: Array<{ id: string; name: string; access_token: string }>
}> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${userAccessToken}`,
  )

  if (!res.ok) {
    throw new Error('Failed to get user pages')
  }

  return res.json()
}
