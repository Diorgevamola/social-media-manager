-- ============================================================
-- Schedule Migration
-- Adds: schedules + schedule_posts tables + Storage bucket
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- SCHEDULES (cronogramas gerados pela IA)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.schedules (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id    UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  period        INTEGER NOT NULL CHECK (period IN (7, 15, 30)),
  generated_at  TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules: all own"
  ON public.schedules FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_schedules_user_id    ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_account_id ON public.schedules(account_id);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON public.schedules(created_at DESC);

-- ============================================================
-- SCHEDULE_POSTS (posts individuais de cada cronograma)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.schedule_posts (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  schedule_id          UUID REFERENCES public.schedules(id) ON DELETE CASCADE NOT NULL,
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Calendário
  date                 DATE NOT NULL,
  post_type            TEXT NOT NULL CHECK (post_type IN ('post', 'reel', 'carousel', 'story')),
  time                 TEXT,

  -- Conteúdo gerado pela IA
  theme                TEXT NOT NULL,
  caption              TEXT,
  content_pillar       TEXT,
  seasonal_hook        TEXT,

  -- Briefing visual (post | carousel | story)
  visual_data          JSONB,

  -- Roteiro (reel)
  script_data          JSONB,

  -- Mídia gerada (Imagen / VEO) — Supabase Storage URLs
  generated_image_url  TEXT,
  generated_video_url  TEXT,

  -- Status de publicação
  status               TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'published')),

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.schedule_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_posts: all own"
  ON public.schedule_posts FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_schedule_posts_schedule_id ON public.schedule_posts(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_posts_user_id     ON public.schedule_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_posts_date        ON public.schedule_posts(date);
CREATE INDEX IF NOT EXISTS idx_schedule_posts_type        ON public.schedule_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_schedule_posts_status      ON public.schedule_posts(status);

-- Trigger updated_at
CREATE TRIGGER update_schedule_posts_updated_at
  BEFORE UPDATE ON public.schedule_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- STORAGE BUCKET: schedule-media
-- Stores AI-generated images and videos per post
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'schedule-media',
  'schedule-media',
  false,
  52428800, -- 50 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: only owner can read/write their own files
CREATE POLICY "schedule-media: owner select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'schedule-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "schedule-media: owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'schedule-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "schedule-media: owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'schedule-media' AND auth.uid()::text = (storage.foldername(name))[1]);
