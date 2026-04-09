-- =============================================================
-- Localização de serviço do prestador
-- Suporta modo tempo-real (GPS) e localização fixa com raio de atendimento
-- =============================================================
CREATE TABLE IF NOT EXISTS provider_locations (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            uuid          NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Modo de localização
  location_mode         text          NOT NULL DEFAULT 'realtime'
    CHECK (location_mode IN ('realtime', 'fixed')),

  -- Raio de atendimento em metros (10m a 100km)
  service_radius_meters integer       NOT NULL DEFAULT 5000
    CHECK (service_radius_meters BETWEEN 10 AND 100000),

  -- Localização fixa
  fixed_address         text,
  fixed_lat             decimal(9, 6),
  fixed_lng             decimal(9, 6),

  -- Localização em tempo real (atualizada pelo app)
  realtime_lat          decimal(9, 6),
  realtime_lng          decimal(9, 6),
  realtime_updated_at   timestamptz,

  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

-- =============================================================
-- Índices
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_provider_locations_profile ON provider_locations (profile_id);

-- =============================================================
-- Row Level Security
-- =============================================================
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;

-- Leitura pública: qualquer usuário pode ver a localização dos prestadores
-- (a localização real-time é aproximada no app, nunca exata)
CREATE POLICY "provider_locations_select" ON provider_locations
  FOR SELECT USING (true);

-- Escrita: apenas o próprio prestador pode inserir/atualizar/deletar
CREATE POLICY "provider_locations_insert" ON provider_locations
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "provider_locations_update" ON provider_locations
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "provider_locations_delete" ON provider_locations
  FOR DELETE USING (auth.uid() = profile_id);

-- =============================================================
-- Trigger: atualiza updated_at automaticamente
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_provider_location_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_provider_location_updated ON provider_locations;
CREATE TRIGGER on_provider_location_updated
  BEFORE UPDATE ON provider_locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_provider_location_updated_at();
