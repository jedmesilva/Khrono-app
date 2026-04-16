DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'contract_time_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.contract_time_entries;
  END IF;
END $$;

DROP TABLE IF EXISTS public.contract_time_entries CASCADE;

ALTER TABLE public.contracts
  DROP COLUMN IF EXISTS end_requested_by,
  DROP COLUMN IF EXISTS end_reason,
  DROP COLUMN IF EXISTS cancel_requested_by,
  DROP COLUMN IF EXISTS cancel_reason;