-- =============================================================
-- Drop legacy duplicate RLS policies on `contracts`
--
-- The migration `20260420_contract_draft_and_deliveries.sql` added
-- `contracts_select_parties` to hide drafts from the hired party,
-- but the legacy `contracts_select` policy was never removed.
-- Because PostgreSQL combines PERMISSIVE policies with OR, the
-- legacy policy re-grants the hired party access to draft rows,
-- effectively cancelling the draft protection. Realtime SELECT-
-- based subscriptions then deliver INSERT events for drafts to the
-- hired party, notifying them before payment is confirmed.
--
-- This migration removes the legacy duplicates so only the newer,
-- draft-aware policies remain in effect.
-- =============================================================

-- SELECT: legacy policy ignored draft status — drop it
DROP POLICY IF EXISTS "contracts_select" ON public.contracts;

-- INSERT: legacy duplicate of contracts_insert_contractor
DROP POLICY IF EXISTS "contracts_insert" ON public.contracts;

-- UPDATE: legacy duplicate of contracts_update_parties
DROP POLICY IF EXISTS "contracts_update" ON public.contracts;
