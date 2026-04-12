ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('active', 'paused', 'pending_signature', 'accepted', 'ended', 'cancelled', 'disputed'));

ALTER TABLE provider_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers manage own pins" ON provider_pins;
DROP POLICY IF EXISTS "anyone can read active pins" ON provider_pins;
DROP POLICY IF EXISTS "authenticated users can mark active pins used" ON provider_pins;

CREATE POLICY "providers manage own pins"
  ON provider_pins FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "anyone can read active pins"
  ON provider_pins FOR SELECT
  USING (status = 'active');

CREATE POLICY "authenticated users can mark active pins used"
  ON provider_pins FOR UPDATE
  USING (auth.uid() IS NOT NULL AND status = 'active')
  WITH CHECK (auth.uid() IS NOT NULL AND status = 'used');

UPDATE provider_pins
SET status = CASE WHEN is_active THEN 'active' ELSE 'invalidated' END
WHERE status = 'active'
  AND is_active IS NOT NULL;