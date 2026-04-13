-- push_tokens: stores Expo push tokens per profile
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       text        NOT NULL,
  platform    text        NOT NULL DEFAULT 'unknown'
                          CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users manage their own tokens
CREATE POLICY "users manage own push tokens"
  ON public.push_tokens FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Any authenticated user can read push tokens (needed to send notifications to others)
CREATE POLICY "authenticated users can read push tokens"
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (true);

-- notifications: stores in-app notifications per profile
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL DEFAULT 'general',
  title       text        NOT NULL,
  body        text        NOT NULL,
  data        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users read and update their own notifications
CREATE POLICY "users read own notifications"
  ON public.notifications FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "users update own notifications"
  ON public.notifications FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Any authenticated user can create notifications for others (needed for cross-user events)
CREATE POLICY "authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast per-user queries ordered by time
CREATE INDEX IF NOT EXISTS idx_notifications_profile_created
  ON public.notifications (profile_id, created_at DESC);

-- Enable realtime for instant delivery of new notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
