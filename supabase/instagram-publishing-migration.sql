-- Migração: Colunas para integração OAuth e publicação automática no Instagram
-- Executar no Supabase SQL Editor

-- Conexão OAuth na conta do Instagram
ALTER TABLE public.instagram_accounts
  ADD COLUMN IF NOT EXISTS access_token     TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ig_user_id       TEXT,
  ADD COLUMN IF NOT EXISTS facebook_page_id TEXT;

-- Rastreamento de publicação por post
ALTER TABLE public.schedule_posts
  ADD COLUMN IF NOT EXISTS published_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ig_media_id       TEXT,
  ADD COLUMN IF NOT EXISTS ig_container_id   TEXT,   -- container pendente de reel (async)
  ADD COLUMN IF NOT EXISTS publish_error     TEXT,
  ADD COLUMN IF NOT EXISTS publish_attempts  INTEGER DEFAULT 0;

-- RLS: as colunas adicionadas herdam as policies já existentes nas tabelas
-- Nenhuma policy nova necessária
