-- ============================================================
-- DROP ALL - Social Media Manager Supabase Cleanup
-- Apaga tudo do schema public antes de aplicar o schema novo
-- ATENÇÃO: Irreversível. Execute apenas em ambiente de dev.
-- ============================================================

-- 1. Drop triggers on auth.users (Supabase)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop all tables in public schema (dynamic - pega tudo)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    RAISE NOTICE 'Dropped table: %', r.tablename;
  END LOOP;
END $$;

-- 3. Drop custom functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_lead_score(JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.get_lead_with_details(UUID) CASCADE;

-- 4. Drop custom ENUM types (BDR Platform)
DROP TYPE IF EXISTS lead_status CASCADE;
DROP TYPE IF EXISTS activity_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS pipeline_stage CASCADE;

-- 5. Confirm
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM pg_tables WHERE schemaname = 'public';
  RAISE NOTICE 'Tables remaining in public schema: %', cnt;
END $$;
