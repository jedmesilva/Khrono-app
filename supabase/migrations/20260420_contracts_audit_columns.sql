-- =============================================================
-- Adiciona colunas de auditoria na tabela contracts
-- Registram informações do dispositivo no momento da criação
-- do contrato (spread de AuditSnapshot no insert).
-- =============================================================

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS device_id               text,
  ADD COLUMN IF NOT EXISTS device_platform         text,
  ADD COLUMN IF NOT EXISTS app_version             text,
  ADD COLUMN IF NOT EXISTS ip_address              text,
  ADD COLUMN IF NOT EXISTS user_agent              text,
  ADD COLUMN IF NOT EXISTS latitude                numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude               numeric(10,7),
  ADD COLUMN IF NOT EXISTS location_accuracy_meters numeric(10,2);
