-- =============================================================
-- Histórico de Preços de Serviços
--
-- Mantém um registro imutável de cada alteração de preço
-- em provider_services.valor_hora.
--
-- Cada linha representa um período de vigência de preço:
--   valid_from  → quando o preço entrou em vigor
--   valid_until → quando foi substituído (NULL = preço atual)
--
-- Trigger captura automaticamente qualquer UPDATE em valor_hora.
-- Backfill insere o preço atual de todos os serviços existentes.
-- =============================================================

-- 1. Criar tabela de histórico
CREATE TABLE IF NOT EXISTS service_price_history (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id        uuid          NOT NULL REFERENCES provider_services(id) ON DELETE CASCADE,
  profile_id        uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  valor_hora        numeric(10,2) NOT NULL CHECK (valor_hora > 0),
  valor_hora_anterior numeric(10,2),
  valid_from        timestamptz   NOT NULL DEFAULT now(),
  valid_until       timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_sph_service_id   ON service_price_history (service_id);
CREATE INDEX IF NOT EXISTS idx_sph_profile_id   ON service_price_history (profile_id);
CREATE INDEX IF NOT EXISTS idx_sph_valid_from   ON service_price_history (service_id, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_sph_valid_until  ON service_price_history (service_id, valid_until)
  WHERE valid_until IS NULL;

-- 3. RLS
ALTER TABLE service_price_history ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ver o histórico de preços (catálogo público)
CREATE POLICY "sph_select" ON service_price_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Somente o próprio prestador pode inserir (via trigger, não diretamente)
CREATE POLICY "sph_insert" ON service_price_history
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Ninguém atualiza ou deleta registros históricos (imutável)
-- (sem políticas de UPDATE/DELETE = bloqueado por RLS)

-- 4. Trigger: captura alterações de valor_hora em provider_services
CREATE OR REPLACE FUNCTION public.handle_service_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Só age quando valor_hora realmente mudou
  IF OLD.valor_hora IS NOT DISTINCT FROM NEW.valor_hora THEN
    RETURN NEW;
  END IF;

  -- Fecha o período anterior (seta valid_until no registro vigente)
  UPDATE service_price_history
  SET valid_until = now()
  WHERE service_id  = NEW.id
    AND valid_until IS NULL;

  -- Insere o novo preço
  INSERT INTO service_price_history (
    service_id,
    profile_id,
    valor_hora,
    valor_hora_anterior,
    valid_from,
    valid_until
  ) VALUES (
    NEW.id,
    NEW.profile_id,
    NEW.valor_hora,
    OLD.valor_hora,
    now(),
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_service_price_change ON provider_services;
CREATE TRIGGER on_service_price_change
  AFTER UPDATE OF valor_hora ON provider_services
  FOR EACH ROW EXECUTE FUNCTION public.handle_service_price_change();

-- 5. Backfill: registra o preço atual de todos os serviços como entrada inicial
INSERT INTO service_price_history (
  service_id,
  profile_id,
  valor_hora,
  valor_hora_anterior,
  valid_from,
  valid_until
)
SELECT
  ps.id,
  ps.profile_id,
  ps.valor_hora,
  NULL,            -- sem preço anterior (registro inicial)
  ps.created_at,  -- válido desde a criação do serviço
  NULL             -- ainda vigente
FROM provider_services ps
WHERE ps.valor_hora IS NOT NULL
ON CONFLICT DO NOTHING;
