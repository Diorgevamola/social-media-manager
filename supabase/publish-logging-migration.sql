-- Migração: Sistema de logging de publicação com histórico e retry tracking
-- Executar no Supabase SQL Editor

-- 1. Tabela de histórico de publicação (auditoria e debug)
CREATE TABLE IF NOT EXISTS public.schedule_posts_publish_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.schedule_posts(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'success', 'pending_reel', 'error'
  ig_media_id TEXT,
  ig_container_id TEXT,
  error_message TEXT,
  duration_ms INTEGER, -- tempo de execução em milissegundos
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Índices para melhor performance em queries
CREATE INDEX IF NOT EXISTS idx_publish_log_user_post
  ON public.schedule_posts_publish_log(user_id, post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_publish_log_status
  ON public.schedule_posts_publish_log(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_publish_log_post_attempt
  ON public.schedule_posts_publish_log(post_id, attempt_number DESC);

-- 3. Adicionar coluna publish_history em schedule_posts para histórico JSON
ALTER TABLE public.schedule_posts
  ADD COLUMN IF NOT EXISTS publish_history JSONB DEFAULT '{"attempts": [], "lastAttempt": null}';

-- 4. RLS Policies para schedule_posts_publish_log
-- Usuários só veem seu próprio histórico
ALTER TABLE public.schedule_posts_publish_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own publish logs"
  ON public.schedule_posts_publish_log
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own publish logs (for API)"
  ON public.schedule_posts_publish_log
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 5. Função para atualizar updated_at automatically
CREATE OR REPLACE FUNCTION public.update_publish_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_publish_log_timestamp
  BEFORE UPDATE ON public.schedule_posts_publish_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_publish_log_timestamp();

-- 6. Comentários para documentação
COMMENT ON TABLE public.schedule_posts_publish_log IS 'Histórico de tentativas de publicação com detalhes de erros e sucessos';
COMMENT ON COLUMN public.schedule_posts_publish_log.attempt_number IS 'Número sequencial da tentativa (1, 2, 3...)';
COMMENT ON COLUMN public.schedule_posts_publish_log.duration_ms IS 'Tempo em milissegundos que levou para publicar';
COMMENT ON COLUMN public.schedule_posts.publish_history IS 'JSON com histórico resumido: {attempts: [...], lastAttempt: "..."}';
