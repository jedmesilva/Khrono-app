-- =============================================================
-- Sessões de Disponibilidade
-- Cada toggle ON do prestador abre uma sessão; toggle OFF encerra.
-- Histórico completo é mantido na tabela.
-- =============================================================

CREATE TABLE IF NOT EXISTS availability_sessions (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Estado da sessão
  -- pending     → criada localmente, aguardando confirmação de internet
  -- active      → online confirmado, prestador disponível
  -- paused      → estava ativo, perdeu conexão
  -- ended       → encerrada pelo prestador (toggle OFF)
  -- no_connection → tentativa offline; nunca confirmada
  status              text          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'paused', 'ended', 'no_connection')),

  -- PIN gerado para a sessão (4 dígitos)
  session_pin         text,

  -- Geolocalização no momento do toggle ON
  lat                 decimal(9,6),
  lng                 decimal(9,6),
  location_accuracy   decimal(10,4),

  -- Timestamps da sessão
  started_at          timestamptz   NOT NULL DEFAULT now(),
  ended_at            timestamptz,
  last_ping_at        timestamptz,

  metadata            jsonb         NOT NULL DEFAULT '{}',
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

-- =============================================================
-- Índices
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_avail_sessions_profile ON availability_sessions (profile_id);
CREATE INDEX IF NOT EXISTS idx_avail_sessions_status  ON availability_sessions (status);
CREATE INDEX IF NOT EXISTS idx_avail_sessions_started ON availability_sessions (started_at DESC);

-- =============================================================
-- Row Level Security
-- =============================================================
ALTER TABLE availability_sessions ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê todas as suas próprias sessões (histórico completo)
CREATE POLICY "avail_sessions_select_own" ON availability_sessions
  FOR SELECT USING (auth.uid() = profile_id);

-- Qualquer usuário autenticado pode ver sessões ativas (para descoberta de prestadores)
CREATE POLICY "avail_sessions_select_active" ON availability_sessions
  FOR SELECT USING (status IN ('active', 'pending', 'paused'));

-- O prestador insere e atualiza apenas as suas sessões
CREATE POLICY "avail_sessions_insert" ON availability_sessions
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "avail_sessions_update" ON availability_sessions
  FOR UPDATE USING (auth.uid() = profile_id);

-- =============================================================
-- Trigger: updated_at automático
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_availability_session_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_availability_session_updated ON availability_sessions;
CREATE TRIGGER on_availability_session_updated
  BEFORE UPDATE ON availability_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_availability_session_updated_at();
