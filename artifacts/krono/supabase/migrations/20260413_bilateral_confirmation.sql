-- Bilateral confirmation columns for contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS end_requested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS end_reason text,
  ADD COLUMN IF NOT EXISTS cancel_requested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- New statuses used by the app:
-- pending_end    → end requested by one party, awaiting other's confirmation
-- pending_cancel → cancel requested after contract started, awaiting confirmation
-- rejected       → hired party rejected the contract before starting
-- These are text values stored in the existing status column (no enum constraint to alter)
