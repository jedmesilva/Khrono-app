ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS notification_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_contracts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_schedule_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_push_tokens_notification_preferences
  ON public.push_tokens (
    profile_id,
    notification_push_enabled,
    notification_contracts_enabled,
    notification_schedule_enabled
  );