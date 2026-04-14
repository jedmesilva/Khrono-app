-- 1. Expand the status check constraint to include all app statuses
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

-- 2. Set replica identity so realtime delivers full row data on UPDATE/DELETE
--    (contracts is already member of supabase_realtime publication)
ALTER TABLE public.contracts REPLICA IDENTITY FULL;
