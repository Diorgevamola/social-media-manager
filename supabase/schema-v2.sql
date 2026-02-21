-- ============================================================
-- Social Media Manager - Schema v2
-- MVP: Criação de Conteúdo com IA (sem integração Meta/OAuth)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DROP SCHEMA ANTERIOR (limpa tudo antes de recriar)
-- ============================================================

-- Drop triggers nas tabelas existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_content_posts_updated_at ON public.content_posts;

-- Drop tabelas existentes (schema v1)
DROP TABLE IF EXISTS public.ai_generations CASCADE;
DROP TABLE IF EXISTS public.content_posts CASCADE;
DROP TABLE IF EXISTS public.instagram_accounts CASCADE;
DROP TABLE IF EXISTS public.instagram_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

-- ============================================================
-- PROFILES (usuário da plataforma - criado automaticamente)
-- ============================================================

CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: select own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-criar profile ao fazer signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INSTAGRAM PROFILES (perfil de contexto para criação de conteúdo)
-- Sem OAuth - cadastrado manualmente pelo usuário
-- ============================================================

CREATE TABLE public.instagram_profiles (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Identidade
  username         TEXT NOT NULL,
  display_name     TEXT,
  bio              TEXT,
  profile_picture_url TEXT,

  -- Contexto para IA
  niche            TEXT,                    -- ex: fitness, moda, tecnologia, gastronomia
  tone             TEXT DEFAULT 'profissional e engajador', -- tom de voz
  language         TEXT DEFAULT 'português',
  target_audience  TEXT,                    -- ex: mulheres 25-35 interessadas em saúde
  content_pillars  TEXT[],                  -- pilares de conteúdo ex: {motivação, dicas, bastidores}
  brand_colors     TEXT[],                  -- cores da marca ex: {#FF5733, #333333}

  -- Métricas (inseridas manualmente)
  followers_count  INTEGER DEFAULT 0,
  following_count  INTEGER DEFAULT 0,
  posts_count      INTEGER DEFAULT 0,

  -- Controle
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.instagram_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instagram_profiles: all own" ON public.instagram_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_instagram_profiles_user_id ON public.instagram_profiles(user_id);
CREATE INDEX idx_instagram_profiles_active ON public.instagram_profiles(user_id, is_active);

-- ============================================================
-- CONTENT POSTS (posts criados na plataforma)
-- ============================================================

CREATE TABLE public.content_posts (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id      UUID REFERENCES public.instagram_profiles(id) ON DELETE SET NULL,

  -- Tipo e conteúdo
  post_type       TEXT NOT NULL CHECK (post_type IN ('post', 'reel', 'story', 'carousel')),
  caption         TEXT,
  hashtags        TEXT[],
  cta             TEXT,                     -- call to action

  -- Carrossel: slides com texto e visual
  slides          JSONB DEFAULT '[]',       -- [{title, body, visual_tip}]

  -- Mídia
  media_urls      TEXT[] DEFAULT '{}',      -- URLs de imagens/vídeos (upload futuro)
  cover_url       TEXT,                     -- thumbnail/capa

  -- Configuração visual (para preview)
  visual_config   JSONB DEFAULT '{}',       -- {bg_color, font, layout, overlay_opacity}

  -- Ideias e notas
  content_ideas   TEXT[],                   -- ideias visuais geradas pela IA
  notes           TEXT,                     -- notas do usuário

  -- Status e agendamento
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'published')),
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_posts: all own" ON public.content_posts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_content_posts_user_id     ON public.content_posts(user_id);
CREATE INDEX idx_content_posts_profile_id  ON public.content_posts(profile_id);
CREATE INDEX idx_content_posts_status      ON public.content_posts(status);
CREATE INDEX idx_content_posts_type        ON public.content_posts(post_type);
CREATE INDEX idx_content_posts_scheduled   ON public.content_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- ============================================================
-- AI GENERATIONS (histórico de gerações por IA)
-- ============================================================

CREATE TABLE public.ai_generations (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id  UUID REFERENCES public.instagram_profiles(id) ON DELETE SET NULL,
  post_id     UUID REFERENCES public.content_posts(id) ON DELETE SET NULL,

  post_type   TEXT,
  prompt      TEXT,
  result      JSONB,                        -- {caption, hashtags, content_ideas, cta, slides}
  model       TEXT DEFAULT 'gemini-1.5-flash',

  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_generations: all own" ON public.ai_generations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ai_generations_user_id    ON public.ai_generations(user_id);
CREATE INDEX idx_ai_generations_profile_id ON public.ai_generations(profile_id);
CREATE INDEX idx_ai_generations_post_id    ON public.ai_generations(post_id);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_instagram_profiles_updated_at
  BEFORE UPDATE ON public.instagram_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_content_posts_updated_at
  BEFORE UPDATE ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- FIM DO SCHEMA v2
-- ============================================================
