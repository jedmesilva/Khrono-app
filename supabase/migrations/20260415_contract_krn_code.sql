-- =============================================================
-- Contract KRN Code
-- Garante que todo contrato tenha um código KRN único e persistente
-- no formato KRN-XXXXXXXX (últimos 8 chars do UUID em maiúsculo).
--
-- A coluna `code` já existe na tabela contracts.
-- Esta migration:
--   1. Backfill dos registros existentes sem código
--   2. Adiciona constraint UNIQUE
--   3. Adiciona trigger para auto-gerar em novos contratos
-- =============================================================

-- 1. Backfill: preenche registros onde code está nulo ou vazio
UPDATE contracts
SET code = 'KRN-' || UPPER(RIGHT(id::text, 8))
WHERE code IS NULL OR code = '';

-- 2. NOT NULL agora que todos os registros estão preenchidos
ALTER TABLE contracts
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN code SET DEFAULT '';

-- 3. UNIQUE constraint para garantir unicidade do código
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_code_unique;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_code_unique UNIQUE (code);

-- 4. Trigger: gera o código KRN automaticamente em novos contratos
CREATE OR REPLACE FUNCTION public.handle_contract_krn_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'KRN-' || UPPER(RIGHT(NEW.id::text, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contract_krn_code ON contracts;
CREATE TRIGGER on_contract_krn_code
  BEFORE INSERT ON contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_contract_krn_code();

-- 5. Índice para busca rápida por código
CREATE INDEX IF NOT EXISTS idx_contracts_code ON contracts (code);
