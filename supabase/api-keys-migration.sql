-- API Keys table
-- Permite que usuários criem chaves para autenticar chamadas programáticas à API

CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  prefix      TEXT        NOT NULL,       -- primeiros 12 chars para exibição (ex: "smm_Ab1cDe2f")
  key_hash    TEXT        NOT NULL UNIQUE, -- SHA-256 da chave completa
  last_used_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,               -- NULL = nunca expira
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ                -- NULL = ativa
);

-- Índices
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx  ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own api keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can revoke own api keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);
