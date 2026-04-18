-- ============================================================
-- Skill: is_active para mostrar/ocultar skill no perfil público
-- ============================================================
ALTER TABLE user_skills
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ============================================================
-- Tool: marca, modelo, ano de fabricação e status de verificação
-- ============================================================
ALTER TABLE provider_tools
  ADD COLUMN IF NOT EXISTS brand               text,
  ADD COLUMN IF NOT EXISTS model               text,
  ADD COLUMN IF NOT EXISTS manufacture_year    int,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  ADD COLUMN IF NOT EXISTS verified_at         timestamptz;

CREATE INDEX IF NOT EXISTS idx_provider_tools_verification
  ON provider_tools (profile_id, verification_status);
