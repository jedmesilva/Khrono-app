-- Upgrade provider_pins with proper status lifecycle
-- status: active (valid, awaiting use) | used (consumed by a contract) | invalidated (manually replaced or session ended)

ALTER TABLE provider_pins
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'used', 'invalidated')),
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES availability_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS used_at timestamptz,
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz;

-- Migrate existing rows: is_active=false → invalidated, is_active=true → active
UPDATE provider_pins
SET status = CASE WHEN is_active THEN 'active' ELSE 'invalidated' END
WHERE status = 'active'; -- only touch rows not yet migrated

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_pins_profile_status
  ON provider_pins(profile_id, status);

CREATE INDEX IF NOT EXISTS idx_provider_pins_pin_status
  ON provider_pins(pin, status);

-- RLS: already inherited from existing policies; add one for status-based lookup
-- Contractors can read active pins (to resolve a provider by PIN)
-- Providers can read/update their own pins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'provider_pins' AND policyname = 'providers manage own pins'
  ) THEN
    ALTER TABLE provider_pins ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "providers manage own pins"
      ON provider_pins FOR ALL
      USING (auth.uid() = profile_id)
      WITH CHECK (auth.uid() = profile_id);

    CREATE POLICY "anyone can read active pins"
      ON provider_pins FOR SELECT
      USING (status = 'active');
  END IF;
END $$;
