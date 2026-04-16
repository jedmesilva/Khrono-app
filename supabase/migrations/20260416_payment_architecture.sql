-- =============================================================
-- Payment Architecture v2
-- Implementa lógica completa de pagamentos por tipo de contrato:
--   - billing_trigger: quando o pagamento ocorre (na criação ou no encerramento)
--   - contract_refunds: reembolsos para wallet quando contrato definido encerra cedo
--   - contract_payment_splits: suporte a múltiplas formas de pagamento por contrato
--   - Expansão do enum de status em contract_payments
-- =============================================================

-- 1. billing_trigger em contracts
--    'on_end'   → contrato ABERTO: pagamento gerado ao encerrar
--    'on_start' → contrato DEFINIDO: pagamento gerado na criação
--    'split'    → quando há pagamento parcial + excedente pendente
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS billing_trigger text NOT NULL DEFAULT 'on_end'
    CHECK (billing_trigger IN ('on_end', 'on_start', 'split'));

-- Backfill: defined → on_start, open → on_end
UPDATE public.contracts
  SET billing_trigger = CASE WHEN type = 'defined' THEN 'on_start' ELSE 'on_end' END
  WHERE billing_trigger = 'on_end';

-- 2. contract_refunds: registro imutável de reembolsos gerados pelo sistema
CREATE TABLE IF NOT EXISTS public.contract_refunds (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   uuid          NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payment_id    uuid          REFERENCES public.contract_payments(id) ON DELETE SET NULL,
  profile_id    uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  reason        text          NOT NULL
    CHECK (reason IN ('early_end', 'overpayment', 'card_release', 'cancelled')),
  status        text          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed')),
  wallet_tx_id  uuid          REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  processed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_contract_refunds_contract
  ON public.contract_refunds (contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_refunds_profile
  ON public.contract_refunds (profile_id);
CREATE INDEX IF NOT EXISTS idx_contract_refunds_status
  ON public.contract_refunds (status)
  WHERE status = 'pending';

ALTER TABLE public.contract_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_refunds_select_parties"
  ON public.contract_refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_refunds.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_refunds_insert_system"
  ON public.contract_refunds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_refunds.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_refunds_update_own"
  ON public.contract_refunds FOR UPDATE
  USING (auth.uid() = profile_id);

-- 3. contract_payment_splits: um split por método de pagamento
--    Permite contratos com múltiplas formas (ex: Pix + Dinheiro)
CREATE TABLE IF NOT EXISTS public.contract_payment_splits (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   uuid          NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payment_id    uuid          REFERENCES public.contract_payments(id) ON DELETE SET NULL,
  method        text          NOT NULL
    CHECK (method IN ('cash', 'pix', 'card', 'wallet_balance')),
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  status        text          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  sequence      int           NOT NULL DEFAULT 1,
  note          text,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_payment_splits_contract
  ON public.contract_payment_splits (contract_id);

ALTER TABLE public.contract_payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_payment_splits_select_parties"
  ON public.contract_payment_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_payment_splits.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_payment_splits_insert_parties"
  ON public.contract_payment_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_payment_splits.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

CREATE POLICY "contract_payment_splits_update_parties"
  ON public.contract_payment_splits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_payment_splits.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

-- 4. Adicionar 'held' e 'pending_retry' ao enum de contract_payments.status
--    held         → reserva de cartão ou saldo (contrato definido, aguardando encerramento)
--    pending_retry→ cobrança falhou, aguarda nova tentativa ou troca de método
ALTER TABLE public.contract_payments
  DROP CONSTRAINT IF EXISTS contract_payments_status_check;

ALTER TABLE public.contract_payments
  ADD CONSTRAINT contract_payments_status_check CHECK (
    status IN (
      'pending_request',
      'awaiting_payer_confirmation',
      'awaiting_payee_confirmation',
      'awaiting_dual_confirmation',
      'held',
      'confirmed',
      'disputed',
      'cancelled',
      'refunded',
      'failed',
      'pending_retry'
    )
  );

-- 5. pending_extra_amount em contracts: valor excedente que precisa ser pago
--    Gerado quando contrato definido encerra depois do tempo e o pré-pagamento não cobre o total
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS pending_extra_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS pending_refund_amount numeric(12,2);

-- 6. Realtime para as novas tabelas
ALTER TABLE public.contract_refunds REPLICA IDENTITY FULL;
ALTER TABLE public.contract_payment_splits REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'contract_refunds'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_refunds;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'contract_payment_splits'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_payment_splits;
    END IF;
  END IF;
END $$;
