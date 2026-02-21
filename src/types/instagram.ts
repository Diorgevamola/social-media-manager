export interface IGAccount {
  id: string
  username: string
  name: string
  profile_picture_url: string
  followers_count: number
  following_count: number
  media_count: number
  biography: string
  website: string
  account_type: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL'
}

export interface IGMedia {
  id: string
  caption: string | null
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url: string | null
  permalink: string
  timestamp: string
  like_count: number
  comments_count: number
}

export interface IGMediaInsights {
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  engagement: number
}

export interface IGAccountInsights {
  followers_count: number
  reach: number
  impressions: number
  profile_views: number
  website_clicks: number
}

export interface IGPageInfo {
  id: string
  name: string
  access_token: string
}

export interface IGOAuthTokenResponse {
  access_token: string
  token_type: string
}

export interface IGLongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface AIGeneratedContent {
  caption: string
  hashtags: string[]
  contentIdeas: string[]
  cta: string
}
