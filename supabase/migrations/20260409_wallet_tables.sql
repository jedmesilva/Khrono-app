-- =============================================================
-- Wallet: tabela principal (uma por usuário)
-- =============================================================
CREATE TABLE IF NOT EXISTS wallets (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid         NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance      decimal(12,2) NOT NULL DEFAULT 0.00,
  status       text         NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'frozen')),
  currency     text         NOT NULL DEFAULT 'BRL',
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

-- =============================================================
-- Cartões salvos do usuário (apenas metadados — sem número completo)
-- =============================================================
CREATE TABLE IF NOT EXISTS wallet_cards (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bandeira     text         NOT NULL,          -- 'Visa', 'Mastercard', 'Elo', 'Amex'
  last_four    text         NOT NULL,          -- últimos 4 dígitos
  titular      text         NOT NULL,
  validade     text         NOT NULL,          -- formato MM/AA
  is_default   boolean      NOT NULL DEFAULT false,
  is_active    boolean      NOT NULL DEFAULT true,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

-- =============================================================
-- Transações da carteira (depósitos, saques, pagamentos, recebimentos)
-- =============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       uuid          NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  profile_id      uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            text          NOT NULL
    CHECK (type IN ('deposit', 'withdrawal', 'contract_payment', 'contract_receipt', 'refund', 'chargeback')),
  status          text          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  amount          decimal(12,2) NOT NULL,
  balance_before  decimal(12,2),
  balance_after   decimal(12,2),
  description     text,
  contract_id     uuid          REFERENCES contracts(id) ON DELETE SET NULL,
  card_id         uuid          REFERENCES wallet_cards(id) ON DELETE SET NULL,
  pix_key         text,
  pix_key_type    text          CHECK (pix_key_type IN ('cpf', 'email', 'phone', 'random') OR pix_key_type IS NULL),
  metadata        jsonb         NOT NULL DEFAULT '{}',
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- =============================================================
-- Indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_wallets_profile         ON wallets (profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_cards_profile    ON wallet_cards (profile_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet        ON wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_profile       ON wallet_transactions (profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created       ON wallet_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_contract      ON wallet_transactions (contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_tx_status        ON wallet_transactions (status);

-- =============================================================
-- Row Level Security
-- =============================================================

-- wallets: usuário vê e edita apenas a sua
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_select" ON wallets FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "wallets_insert" ON wallets FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "wallets_update" ON wallets FOR UPDATE USING (auth.uid() = profile_id);

-- wallet_cards: usuário vê e gerencia apenas os seus
ALTER TABLE wallet_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_cards_select" ON wallet_cards FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "wallet_cards_insert" ON wallet_cards FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "wallet_cards_update" ON wallet_cards FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "wallet_cards_delete" ON wallet_cards FOR DELETE USING (auth.uid() = profile_id);

-- wallet_transactions: usuário vê apenas as suas; insert via app
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_tx_select" ON wallet_transactions FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "wallet_tx_insert" ON wallet_transactions FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- =============================================================
-- Trigger: cria wallet automaticamente ao criar um novo perfil
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

-- Backfill: cria wallets para perfis já existentes
INSERT INTO public.wallets (profile_id)
SELECT id FROM public.profiles
ON CONFLICT (profile_id) DO NOTHING;
