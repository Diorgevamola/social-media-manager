-- Admin Migration: ai_usage_logs table
-- Execute this in the Supabase SQL Editor before using the admin panel.

CREATE TABLE public.ai_usage_logs (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type   TEXT NOT NULL,
  -- 'text'|'schedule'|'image'|'video'|'caption'|'hashtags'|'ideas'|'research'
  model            TEXT NOT NULL,
  -- 'gemini-1.5-flash'|'gemini-2.0-flash'|'gemini-3-pro-image-preview'|'veo-3.1-generate-preview'
  input_tokens     INTEGER DEFAULT 0,
  output_tokens    INTEGER DEFAULT 0,
  generation_count INTEGER DEFAULT 1,
  cost_usd         NUMERIC(10,6) DEFAULT 0,
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
-- No user policies — only service role accesses this table (admin bypasses RLS)

CREATE INDEX idx_ai_usage_logs_user_id    ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_operation  ON public.ai_usage_logs(operation_type);
CREATE INDEX idx_ai_usage_logs_model      ON public.ai_usage_logs(model);
