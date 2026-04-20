-- =============================================================
-- Contract Draft Status + Contract Deliveries Table
--
-- DRAFT STATUS
-- Contracts created while the contractor processes payment are
-- stored as 'draft' — invisible to the hired party via RLS.
-- Once payment is confirmed the contractor calls finalizeContract()
-- which atomically moves the contract to 'pending_signature' and
-- inserts a contract_deliveries row to notify the hired party.
--
-- CONTRACT DELIVERIES
-- Tracks when a contract is delivered to and seen by the hired
-- party. The hired party's app listens to realtime INSERTs on this
-- table rather than polling contracts directly, so they never see
-- a contract before payment is confirmed.
-- =============================================================

-- 1. Add 'draft' to the contracts status enum
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check CHECK (
    status IN (
      'draft',
      'active',
      'paused',
      'ended',
      'pending_signature',
      'accepted',
      'pending_end',
      'pending_cancel',
      'rejected',
      'cancelled',
      'disputed'
    )
  );

-- 2. Update contracts RLS: hired party cannot see draft contracts
--    Contractor sees all their own (including drafts for the payment window).
DROP POLICY IF EXISTS "contracts_select_parties" ON public.contracts;

CREATE POLICY "contracts_select_parties"
  ON public.contracts FOR SELECT
  USING (
    auth.uid() = contractor_id
    OR (auth.uid() = hired_id AND status != 'draft')
  );

-- 3. contract_deliveries — immutable delivery receipt per contract/recipient
CREATE TABLE IF NOT EXISTS public.contract_deliveries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     uuid        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  recipient_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- pending  → created, waiting for the hired party to open the app
  -- delivered→ hired party's device received the push / realtime event
  -- seen     → hired party opened the contract detail screen
  status          text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'seen')),

  delivered_at    timestamptz,
  seen_at         timestamptz,

  -- Device/context at the time of delivery (populated server-side on finalize)
  device_id       text,
  device_platform text,
  app_version     text,
  ip_address      text,

  -- Device/context at the time of first view (populated by hired party)
  seen_device_id       text,
  seen_device_platform text,
  seen_app_version     text,
  seen_latitude        numeric(10,7),
  seen_longitude       numeric(10,7),

  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (contract_id, recipient_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_contract_deliveries_recipient
  ON public.contract_deliveries (recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_contract_deliveries_contract
  ON public.contract_deliveries (contract_id);

-- 5. RLS on contract_deliveries
ALTER TABLE public.contract_deliveries ENABLE ROW LEVEL SECURITY;

-- Recipient sees their own deliveries; contractor sees all for their contracts
CREATE POLICY "contract_deliveries_select"
  ON public.contract_deliveries FOR SELECT
  USING (
    auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_deliveries.contract_id
        AND c.contractor_id = auth.uid()
    )
  );

-- Only the contractor inserts deliveries (via finalizeContract)
CREATE POLICY "contract_deliveries_insert"
  ON public.contract_deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_deliveries.contract_id
        AND c.contractor_id = auth.uid()
    )
  );

-- Only the recipient updates their delivery (mark as delivered/seen)
CREATE POLICY "contract_deliveries_update_recipient"
  ON public.contract_deliveries FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- 6. Realtime — hired party subscribes to INSERT events on this table
ALTER TABLE public.contract_deliveries REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'contract_deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_deliveries;
  END IF;
END $$;
