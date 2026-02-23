export type PostType = 'post' | 'carousel' | 'reel'
export type PostStatus = 'draft' | 'planned' | 'published'
export type BrandVoice = 'professional' | 'casual' | 'inspirational' | 'educational' | 'funny'
export type MainGoal = 'engagement' | 'growth' | 'sales' | 'authority'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface InstagramAccount {
  id: string
  user_id: string
  username: string
  name: string | null
  profile_picture_url: string | null
  biography: string | null
  website: string | null
  // Estratégia de conteúdo
  niche: string | null
  target_audience: string | null
  brand_voice: BrandVoice
  content_pillars: string[] | null
  posting_frequency: number
  // Objetivo
  main_goal: MainGoal
  strategic_notes: string | null
  // Identidade visual
  color_palette: string[] | null
  // Restrições de conteúdo
  negative_words: string[] | null
  // Base de conhecimento
  knowledge_base_enabled: boolean
  knowledge_base_influence: number
  // Conexão OAuth com Meta
  access_token: string | null
  token_expires_at: string | null
  ig_user_id: string | null
  facebook_page_id: string | null
  // Metadados
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ContentPost {
  id: string
  user_id: string
  account_id: string | null
  post_type: PostType
  caption: string | null
  hashtags: string[] | null
  media_urls: string[] | null
  notes: string | null
  status: PostStatus
  scheduled_at: string | null
  published_at: string | null
  ig_media_id: string | null
  created_at: string
  updated_at: string
}

export interface AIGeneration {
  id: string
  user_id: string
  account_id: string | null
  post_type: string | null
  prompt: string | null
  result: Record<string, unknown> | null
  created_at: string
}

export interface Schedule {
  id: string
  user_id: string
  account_id: string | null
  period: 7 | 15 | 30
  generated_at: string
  created_at: string
}

export interface SchedulePostRow {
  id: string
  schedule_id: string
  user_id: string
  date: string
  post_type: 'post' | 'reel' | 'carousel' | 'story' | 'story_sequence'
  time: string | null
  theme: string
  caption: string | null
  content_pillar: string | null
  seasonal_hook: string | null
  visual_data: Record<string, unknown> | null
  script_data: Record<string, unknown> | null
  generated_image_url: string | null
  generated_video_url: string | null
  slide_image_urls: Record<string, string> | null
  confirmed: boolean
  status: 'planned' | 'published'
  published_at: string | null
  ig_media_id: string | null
  ig_container_id: string | null
  publish_error: string | null
  publish_attempts: number
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  user_id: string
  name: string
  prefix: string       // first 12 chars for display
  key_hash: string     // SHA-256, never the raw key
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  revoked_at: string | null
}

export interface KnowledgeDoc {
  id: string
  account_id: string
  user_id: string
  file_name: string
  file_size: number | null
  file_url: string | null
  extracted_text: string | null
  created_at: string
}

export interface AiUsageLog {
  id: string
  user_id: string | null
  operation_type: string
  model: string
  input_tokens: number
  output_tokens: number
  generation_count: number
  cost_usd: number
  metadata: Record<string, unknown> | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      instagram_accounts: {
        Row: InstagramAccount
        Insert: {
          id?: string
          user_id: string
          username: string
          name?: string | null
          profile_picture_url?: string | null
          biography?: string | null
          website?: string | null
          niche?: string | null
          target_audience?: string | null
          brand_voice?: BrandVoice
          content_pillars?: string[] | null
          posting_frequency?: number
          main_goal?: MainGoal
          strategic_notes?: string | null
          color_palette?: string[] | null
          negative_words?: string[] | null
          knowledge_base_enabled?: boolean
          knowledge_base_influence?: number
          access_token?: string | null
          token_expires_at?: string | null
          ig_user_id?: string | null
          facebook_page_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string
          name?: string | null
          profile_picture_url?: string | null
          biography?: string | null
          website?: string | null
          niche?: string | null
          target_audience?: string | null
          brand_voice?: BrandVoice
          content_pillars?: string[] | null
          posting_frequency?: number
          main_goal?: MainGoal
          strategic_notes?: string | null
          color_palette?: string[] | null
          negative_words?: string[] | null
          knowledge_base_enabled?: boolean
          knowledge_base_influence?: number
          access_token?: string | null
          token_expires_at?: string | null
          ig_user_id?: string | null
          facebook_page_id?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      content_posts: {
        Row: ContentPost
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          post_type: PostType
          caption?: string | null
          hashtags?: string[] | null
          media_urls?: string[] | null
          notes?: string | null
          status?: PostStatus
          scheduled_at?: string | null
          published_at?: string | null
          ig_media_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          account_id?: string | null
          post_type?: PostType
          caption?: string | null
          hashtags?: string[] | null
          media_urls?: string[] | null
          notes?: string | null
          status?: PostStatus
          scheduled_at?: string | null
          published_at?: string | null
          ig_media_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: AIGeneration
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          post_type?: string | null
          prompt?: string | null
          result?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          user_id?: string
          account_id?: string | null
          post_type?: string | null
          prompt?: string | null
          result?: Record<string, unknown> | null
        }
        Relationships: []
      }
      schedules: {
        Row: Schedule
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          period: 7 | 15 | 30
          generated_at: string
          created_at?: string
        }
        Update: {
          account_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: ApiKey
        Insert: {
          id?: string
          user_id: string
          name: string
          prefix: string
          key_hash: string
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
          revoked_at?: string | null
        }
        Update: {
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      schedule_posts: {
        Row: SchedulePostRow
        Insert: {
          id?: string
          schedule_id: string
          user_id: string
          date: string
          post_type: 'post' | 'reel' | 'carousel' | 'story' | 'story_sequence'
          time?: string | null
          theme: string
          caption?: string | null
          content_pillar?: string | null
          seasonal_hook?: string | null
          visual_data?: Record<string, unknown> | null
          script_data?: Record<string, unknown> | null
          generated_image_url?: string | null
          generated_video_url?: string | null
          confirmed?: boolean
          status?: 'planned' | 'published'
          published_at?: string | null
          ig_media_id?: string | null
          ig_container_id?: string | null
          publish_error?: string | null
          publish_attempts?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          date?: string
          time?: string | null
          generated_image_url?: string | null
          generated_video_url?: string | null
          slide_image_urls?: Record<string, string> | null
          confirmed?: boolean
          status?: 'planned' | 'published'
          published_at?: string | null
          ig_media_id?: string | null
          ig_container_id?: string | null
          publish_error?: string | null
          publish_attempts?: number
          updated_at?: string
        }
        Relationships: []
      }
      account_knowledge_docs: {
        Row: KnowledgeDoc
        Insert: {
          id?: string
          account_id: string
          user_id: string
          file_name: string
          file_size?: number | null
          file_url?: string | null
          extracted_text?: string | null
          created_at?: string
        }
        Update: {
          file_name?: string
          extracted_text?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: AiUsageLog
        Insert: {
          id?: string
          user_id?: string | null
          operation_type: string
          model: string
          input_tokens?: number
          output_tokens?: number
          generation_count?: number
          cost_usd?: number
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
