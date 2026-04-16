ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_card_label text,
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS end_requested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS end_reason text,
  ADD COLUMN IF NOT EXISTS cancel_requested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancel_reason text;

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check CHECK (
    status IN (
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

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_payment_status_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_payment_status_check CHECK (
    payment_status IN (
      'pending',
      'awaiting_confirmation',
      'paid',
      'failed',
      'disputed',
      'refunded',
      'cancelled'
    )
  );

ALTER TABLE public.contract_time_entries
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS device_platform text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS location_accuracy_meters numeric(10,2),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.contract_time_entries
  DROP CONSTRAINT IF EXISTS contract_time_entries_event_check;

ALTER TABLE public.contract_time_entries
  ADD CONSTRAINT contract_time_entries_event_check CHECK (
    event IN (
      'created',
      'accepted',
      'started',
      'paused',
      'resumed',
      'ended',
      'cancelled',
      'disputed',
      'rejected',
      'end_requested',
      'end_confirmed',
      'end_rejected',
      'cancel_requested',
      'cancel_confirmed',
      'cancel_rejected',
      'payment_requested',
      'payment_confirmed',
      'payment_disputed'
    )
  );

CREATE TABLE IF NOT EXISTS public.contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('contractor', 'hired', 'platform', 'admin', 'unknown')),
  event_type text NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  device_id text,
  device_platform text,
  app_version text,
  ip_address inet,
  user_agent text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_accuracy_meters numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('end', 'cancel', 'payment', 'change_amount', 'dispute_resolution')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  response_reason text,
  amount numeric(12,2),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.contract_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('cash', 'pix', 'card', 'wallet_balance')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending_request' CHECK (
    status IN (
      'pending_request',
      'awaiting_payer_confirmation',
      'awaiting_payee_confirmation',
      'awaiting_dual_confirmation',
      'confirmed',
      'disputed',
      'cancelled',
      'refunded'
    )
  ),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_payment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.contract_payments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('payer', 'payee')),
  confirmation_type text NOT NULL CHECK (confirmation_type IN ('paid', 'received', 'denied')),
  note text,
  device_id text,
  device_platform text,
  app_version text,
  ip_address inet,
  user_agent text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_accuracy_meters numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.contract_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.contract_payments(id) ON DELETE SET NULL,
  opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  against_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  category text NOT NULL CHECK (
    category IN (
      'payment_not_received',
      'service_not_completed',
      'cancellation_conflict',
      'amount_conflict',
      'no_show',
      'other'
    )
  ),
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'under_review', 'waiting_evidence', 'resolved', 'rejected')
  ),
  resolution text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.contract_dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.contract_disputes(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_type text NOT NULL CHECK (evidence_type IN ('text', 'image', 'receipt', 'location', 'system_event')),
  content text,
  file_url text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_events
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.contract_action_requests
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.contract_payments
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.contract_payment_confirmations
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.contract_disputes
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE public.contract_dispute_evidence
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_payment_confirmations_unique_payment_user
  ON public.contract_payment_confirmations (payment_id, user_id);

CREATE INDEX IF NOT EXISTS idx_contract_events_contract_created
  ON public.contract_events (contract_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_events_actor_created
  ON public.contract_events (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_action_requests_contract_status
  ON public.contract_action_requests (contract_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_payments_contract_status
  ON public.contract_payments (contract_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_payments_payer
  ON public.contract_payments (payer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_payments_payee
  ON public.contract_payments (payee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_payment_confirmations_payment
  ON public.contract_payment_confirmations (payment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_disputes_contract_status
  ON public.contract_disputes (contract_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_dispute_evidence_dispute
  ON public.contract_dispute_evidence (dispute_id, created_at DESC);

ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_dispute_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_events_select_parties" ON public.contract_events;
DROP POLICY IF EXISTS "contract_events_insert_parties" ON public.contract_events;

CREATE POLICY "contract_events_select_parties"
  ON public.contract_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_events.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_events_insert_parties"
  ON public.contract_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_events.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "contract_action_requests_select_parties" ON public.contract_action_requests;
DROP POLICY IF EXISTS "contract_action_requests_insert_parties" ON public.contract_action_requests;
DROP POLICY IF EXISTS "contract_action_requests_update_parties" ON public.contract_action_requests;

CREATE POLICY "contract_action_requests_select_parties"
  ON public.contract_action_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_action_requests.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_action_requests_insert_parties"
  ON public.contract_action_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_action_requests.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_action_requests_update_parties"
  ON public.contract_action_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_action_requests.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_action_requests.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "contract_payments_select_parties" ON public.contract_payments;
DROP POLICY IF EXISTS "contract_payments_insert_parties" ON public.contract_payments;
DROP POLICY IF EXISTS "contract_payments_update_parties" ON public.contract_payments;

CREATE POLICY "contract_payments_select_parties"
  ON public.contract_payments FOR SELECT
  USING (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE POLICY "contract_payments_insert_parties"
  ON public.contract_payments FOR INSERT
  WITH CHECK (
    (auth.uid() = payer_id OR auth.uid() = payee_id)
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_payments.contract_id
        AND c.contractor_id = contract_payments.payer_id
        AND c.hired_id = contract_payments.payee_id
    )
  );

CREATE POLICY "contract_payments_update_parties"
  ON public.contract_payments FOR UPDATE
  USING (auth.uid() = payer_id OR auth.uid() = payee_id)
  WITH CHECK (auth.uid() = payer_id OR auth.uid() = payee_id);

DROP POLICY IF EXISTS "contract_payment_confirmations_select_parties" ON public.contract_payment_confirmations;
DROP POLICY IF EXISTS "contract_payment_confirmations_insert_own" ON public.contract_payment_confirmations;
DROP POLICY IF EXISTS "contract_payment_confirmations_update_own" ON public.contract_payment_confirmations;

CREATE POLICY "contract_payment_confirmations_select_parties"
  ON public.contract_payment_confirmations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contract_payments p
      WHERE p.id = contract_payment_confirmations.payment_id
        AND (p.payer_id = auth.uid() OR p.payee_id = auth.uid())
    )
  );

CREATE POLICY "contract_payment_confirmations_insert_own"
  ON public.contract_payment_confirmations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.contract_payments p
      WHERE p.id = contract_payment_confirmations.payment_id
        AND (p.payer_id = auth.uid() OR p.payee_id = auth.uid())
    )
  );

CREATE POLICY "contract_payment_confirmations_update_own"
  ON public.contract_payment_confirmations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contract_disputes_select_parties" ON public.contract_disputes;
DROP POLICY IF EXISTS "contract_disputes_insert_parties" ON public.contract_disputes;
DROP POLICY IF EXISTS "contract_disputes_update_parties" ON public.contract_disputes;

CREATE POLICY "contract_disputes_select_parties"
  ON public.contract_disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_disputes.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_disputes_insert_parties"
  ON public.contract_disputes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_disputes.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_disputes_update_parties"
  ON public.contract_disputes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_disputes.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_disputes.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "contract_dispute_evidence_select_parties" ON public.contract_dispute_evidence;
DROP POLICY IF EXISTS "contract_dispute_evidence_insert_parties" ON public.contract_dispute_evidence;

CREATE POLICY "contract_dispute_evidence_select_parties"
  ON public.contract_dispute_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.contract_disputes d
      JOIN public.contracts c ON c.id = d.contract_id
      WHERE d.id = contract_dispute_evidence.dispute_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_dispute_evidence_insert_parties"
  ON public.contract_dispute_evidence FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1
      FROM public.contract_disputes d
      JOIN public.contracts c ON c.id = d.contract_id
      WHERE d.id = contract_dispute_evidence.dispute_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contract_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_events;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contract_action_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_action_requests;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contract_payments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_payments;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contract_disputes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_disputes;
    END IF;
  END IF;
END $$;

ALTER TABLE public.contract_events REPLICA IDENTITY FULL;
ALTER TABLE public.contract_action_requests REPLICA IDENTITY FULL;
ALTER TABLE public.contract_payments REPLICA IDENTITY FULL;
ALTER TABLE public.contract_disputes REPLICA IDENTITY FULL;