-- =====================================================
-- Fix RLS for contracts table
-- Allow both contractor and hired party to read/update.
-- =====================================================

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts before recreating
DROP POLICY IF EXISTS "contracts_select_parties"      ON contracts;
DROP POLICY IF EXISTS "contracts_insert_contractor"   ON contracts;
DROP POLICY IF EXISTS "contracts_update_parties"      ON contracts;
DROP POLICY IF EXISTS "contracts_delete_disabled"     ON contracts;

-- Contractor and hired party can both read their contracts
CREATE POLICY "contracts_select_parties"
  ON contracts FOR SELECT
  USING (
    auth.uid() = contractor_id
    OR auth.uid() = hired_id
  );

-- Only the contractor can create a new contract
CREATE POLICY "contracts_insert_contractor"
  ON contracts FOR INSERT
  WITH CHECK (auth.uid() = contractor_id);

-- Both parties can update the contract (hired accepts/begins, contractor ends/cancels)
CREATE POLICY "contracts_update_parties"
  ON contracts FOR UPDATE
  USING (
    auth.uid() = contractor_id
    OR auth.uid() = hired_id
  )
  WITH CHECK (
    auth.uid() = contractor_id
    OR auth.uid() = hired_id
  );

-- =====================================================
-- Fix RLS for contract_time_entries table
-- Both parties involved in the contract may insert.
-- =====================================================

ALTER TABLE contract_time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_time_entries_select_parties"   ON contract_time_entries;
DROP POLICY IF EXISTS "contract_time_entries_insert_parties"   ON contract_time_entries;

-- Both parties can read entries for their contracts
CREATE POLICY "contract_time_entries_select_parties"
  ON contract_time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_time_entries.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

-- Both parties can insert entries for their contracts
CREATE POLICY "contract_time_entries_insert_parties"
  ON contract_time_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_time_entries.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

-- =====================================================
-- Fix RLS for contract_parties table
-- =====================================================

ALTER TABLE contract_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_parties_select_parties"   ON contract_parties;
DROP POLICY IF EXISTS "contract_parties_insert_parties"   ON contract_parties;

-- Anyone involved can see the parties list
CREATE POLICY "contract_parties_select_parties"
  ON contract_parties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_parties.contract_id
        AND (c.contractor_id = auth.uid() OR c.hired_id = auth.uid())
    )
  );

-- Only the contractor can insert (they create the contract)
CREATE POLICY "contract_parties_insert_parties"
  ON contract_parties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_parties.contract_id
        AND c.contractor_id = auth.uid()
    )
  );
