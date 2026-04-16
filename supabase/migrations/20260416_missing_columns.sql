-- ── contracts: colunas faltando ──────────────────────────────────────────────

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz,
  ADD COLUMN IF NOT EXISTS end_requested_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS end_reason          text,
  ADD COLUMN IF NOT EXISTS cancel_requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason       text;

-- Preencher updated_at com created_at para registros existentes
UPDATE public.contracts SET updated_at = created_at WHERE updated_at IS NULL;

-- ── contract_payments: colunas de validação bilateral ────────────────────────

ALTER TABLE public.contract_payments
  ADD COLUMN IF NOT EXISTS payer_amount_reported numeric(12,2),
  ADD COLUMN IF NOT EXISTS payee_amount_reported numeric(12,2),
  ADD COLUMN IF NOT EXISTS has_inconsistency     boolean NOT NULL DEFAULT false;

-- ── contract_payment_confirmations: valor e flag de incompleto ───────────────

ALTER TABLE public.contract_payment_confirmations
  ADD COLUMN IF NOT EXISTS amount_reported numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_incomplete   boolean NOT NULL DEFAULT false;
