-- =============================================================
-- Corrige o Realtime para contracts e provider_pins.
--
-- Problema:
--   Tabelas criadas via migração SQL não são adicionadas à
--   publication supabase_realtime automaticamente. Além disso,
--   sem REPLICA IDENTITY FULL, eventos de UPDATE/DELETE no WAL
--   só incluem o PK + colunas alteradas — filtros em outras
--   colunas (ex.: hired_id, profile_id) nunca batem.
--
-- Efeito:
--   1. A contraparte (hired_id) nunca recebe o evento de INSERT
--      de um novo contrato → contrato não aparece em tempo real.
--   2. O prestador (provider) nunca recebe o evento de UPDATE
--      quando o PIN é marcado como "used" → novo PIN não é gerado.
--
-- Solução:
--   • REPLICA IDENTITY FULL: envia todas as colunas no WAL para
--     UPDATE e DELETE, permitindo que filtros por qualquer coluna
--     funcionem no Realtime.
--   • ALTER PUBLICATION: registra as tabelas na publication do
--     Supabase Realtime.
-- =============================================================

-- 1. REPLICA IDENTITY FULL
ALTER TABLE contracts       REPLICA IDENTITY FULL;
ALTER TABLE provider_pins   REPLICA IDENTITY FULL;
ALTER TABLE availability_sessions REPLICA IDENTITY FULL;

-- 2. Adiciona tabelas à publication do Supabase Realtime
--    (usa DO block para evitar erro se já estiver na publication)
DO $$
BEGIN
  -- contracts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'contracts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
  END IF;

  -- provider_pins
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'provider_pins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_pins;
  END IF;

  -- availability_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'availability_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_sessions;
  END IF;
END $$;
