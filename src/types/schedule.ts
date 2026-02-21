export type PostType = 'post' | 'reel' | 'carousel' | 'story' | 'story_sequence'

export interface CarouselSlide {
  slide_number: number
  headline: string
  description: string
  image_description: string
}

export interface PostVisual {
  headline: string
  subline: string | null
  color_palette: string[]
  fonts: {
    headline: string
    body: string
  }
  image_description: string
  background: string
  slides?: CarouselSlide[]
}

export interface ReelScene {
  time: string
  visual: string
  narration: string
  text_overlay: string | null
}

export interface ReelScript {
  duration: string
  hook: string
  scenes: ReelScene[]
  cta: string
}

export interface SchedulePost {
  type: PostType
  time: string
  theme: string
  caption: string | null
  content_pillar: string | null
  seasonal_hook: string | null
  // post | carousel | story
  visual?: PostVisual
  // reel
  script?: ReelScript
}

export interface ScheduleDay {
  date: string
  day_label: string
  posts: SchedulePost[]
}

export interface GeneratedSchedule {
  schedule: ScheduleDay[]
  account: {
    username: string
    niche: string | null
    brand_voice: string
    main_goal: string
  }
  period: number
  generated_at: string
}
