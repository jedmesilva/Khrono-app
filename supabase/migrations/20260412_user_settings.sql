CREATE TABLE IF NOT EXISTS user_settings (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  notification_push_enabled boolean NOT NULL DEFAULT true,
  notification_contracts_enabled boolean NOT NULL DEFAULT true,
  notification_schedule_enabled boolean NOT NULL DEFAULT false,
  haptics_enabled boolean NOT NULL DEFAULT true,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  biometric_auth_enabled boolean NOT NULL DEFAULT false,
  facial_recognition_enabled boolean NOT NULL DEFAULT false,
  theme_preference text NOT NULL DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_select" ON user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON user_settings;
DROP POLICY IF EXISTS "user_settings_delete" ON user_settings;

CREATE POLICY "user_settings_select" ON user_settings
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "user_settings_insert" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "user_settings_update" ON user_settings
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "user_settings_delete" ON user_settings
  FOR DELETE USING (auth.uid() = profile_id);

CREATE OR REPLACE FUNCTION public.handle_user_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_settings_updated ON user_settings;
CREATE TRIGGER on_user_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_settings_updated_at();