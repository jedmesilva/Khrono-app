-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'general',
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  data        jsonb NOT NULL DEFAULT '{}',
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_profile_id_idx ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- users can read their own notifications
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (profile_id = auth.uid());

-- any authenticated user can insert notifications (to send to others)
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- users can update (mark read) only their own notifications
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (profile_id = auth.uid());

-- users can delete their own notifications
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE USING (profile_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ── push_tokens ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  platform    text NOT NULL DEFAULT 'ios',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_profile_id_idx ON public.push_tokens(profile_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- users manage only their own push tokens
CREATE POLICY push_tokens_all ON public.push_tokens
  FOR ALL USING (profile_id = auth.uid());
