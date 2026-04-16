-- Add amount fields to contract_payment_confirmations
-- Enables bilateral cross-validation of cash payments
ALTER TABLE public.contract_payment_confirmations
  ADD COLUMN IF NOT EXISTS amount_reported numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_incomplete boolean NOT NULL DEFAULT false;

-- Add inconsistency tracking to contract_payments
ALTER TABLE public.contract_payments
  ADD COLUMN IF NOT EXISTS payer_amount_reported numeric(12,2),
  ADD COLUMN IF NOT EXISTS payee_amount_reported numeric(12,2),
  ADD COLUMN IF NOT EXISTS has_inconsistency boolean NOT NULL DEFAULT false;
