-- =============================================================
-- Fix 1: Make started_at nullable so pending/accepted contracts
--         don't inherit the creation timestamp as their start time.
--         beginContract() will explicitly write the real timestamp.
-- =============================================================
ALTER TABLE contracts
  ALTER COLUMN started_at DROP NOT NULL,
  ALTER COLUMN started_at DROP DEFAULT;

-- =============================================================
-- Fix 2: Add a CHECK constraint to prevent invalid status values
-- =============================================================
ALTER TABLE contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('active', 'paused', 'pending_signature', 'accepted', 'ended', 'cancelled', 'disputed'));

-- =============================================================
-- Fix 3: Performance indexes for the two most common queries
--         (.or("contractor_id.eq.X,hired_id.eq.X") + .in("status",[...]))
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id ON contracts (contractor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_hired_id     ON contracts (hired_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status       ON contracts (status);
CREATE INDEX IF NOT EXISTS idx_contracts_started_at   ON contracts (started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contracts_ended_at     ON contracts (ended_at DESC NULLS LAST);

-- =============================================================
-- Fix 4: contract_time_entries – constrain the event column
-- =============================================================
ALTER TABLE contract_time_entries
  ADD CONSTRAINT contract_time_entries_event_check
  CHECK (event IN ('created', 'accepted', 'started', 'paused', 'resumed', 'ended', 'cancelled', 'disputed'));
