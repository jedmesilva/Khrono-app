import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";

export type UserSettings = {
  notification_push_enabled: boolean;
  notification_contracts_enabled: boolean;
  notification_schedule_enabled: boolean;
  haptics_enabled: boolean;
  two_factor_enabled: boolean;
  biometric_auth_enabled: boolean;
  facial_recognition_enabled: boolean;
  theme_preference: ThemePreference;
};

type UserSettingsContextType = {
  settings: UserSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => Promise<void>;
  refresh: () => Promise<void>;
};

const DEFAULT_SETTINGS: UserSettings = {
  notification_push_enabled: true,
  notification_contracts_enabled: true,
  notification_schedule_enabled: false,
  haptics_enabled: true,
  two_factor_enabled: false,
  biometric_auth_enabled: false,
  facial_recognition_enabled: false,
  theme_preference: "light",
};

const UserSettingsContext = createContext<UserSettingsContextType | null>(null);

function mapRowToSettings(row: any): UserSettings {
  return {
    notification_push_enabled: Boolean(row?.notification_push_enabled ?? true),
    notification_contracts_enabled: Boolean(row?.notification_contracts_enabled ?? true),
    notification_schedule_enabled: Boolean(row?.notification_schedule_enabled ?? false),
    haptics_enabled: Boolean(row?.haptics_enabled ?? true),
    two_factor_enabled: Boolean(row?.two_factor_enabled ?? false),
    biometric_auth_enabled: Boolean(row?.biometric_auth_enabled ?? false),
    facial_recognition_enabled: Boolean(row?.facial_recognition_enabled ?? false),
    theme_preference: ["light", "dark", "system"].includes(row?.theme_preference)
      ? row.theme_preference
      : "light",
  };
}

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const { setThemeMode } = useTheme();

  const loadSettings = useCallback(
    async (userId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: selectError } = await supabase
          .from("user_settings")
          .select("*")
          .eq("profile_id", userId)
          .maybeSingle();

        if (selectError) throw selectError;

        if (data) {
          const loaded = mapRowToSettings(data);
          setSettings(loaded);
          setThemeMode(loaded.theme_preference);
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("user_settings")
            .insert({ profile_id: userId, ...DEFAULT_SETTINGS })
            .select("*")
            .single();

          if (insertError) throw insertError;

          const loaded = mapRowToSettings(inserted);
          setSettings(loaded);
          setThemeMode(loaded.theme_preference);
        }
      } catch (e) {
        console.warn("[UserSettingsContext] loadSettings error:", e);
        setError("Não foi possível carregar suas definições.");
      } finally {
        setIsLoading(false);
      }
    },
    [setThemeMode]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userIdRef.current = user.id;
        loadSettings(user.id);
      } else {
        userIdRef.current = null;
        setSettings(DEFAULT_SETTINGS);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        loadSettings(session.user.id);
      } else {
        userIdRef.current = null;
        setSettings(DEFAULT_SETTINGS);
        setError(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadSettings]);

  const updateSetting = useCallback(
    async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      const userId = userIdRef.current;
      if (!userId) return;

      const previous = settings;
      const next = { ...settings, [key]: value };

      setSettings(next);
      setError(null);
      setIsSaving(true);

      if (key === "theme_preference") {
        setThemeMode(value as ThemePreference);
      }

      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert(
          {
            profile_id: userId,
            [key]: value,
          },
          { onConflict: "profile_id" }
        );

      if (upsertError) {
        console.warn("[UserSettingsContext] updateSetting error:", upsertError);
        setSettings(previous);
        if (key === "theme_preference") {
          setThemeMode(previous.theme_preference);
        }
        setError("Não foi possível salvar esta definição.");
      }

      setIsSaving(false);
    },
    [settings, setThemeMode]
  );

  const refresh = useCallback(async () => {
    if (userIdRef.current) await loadSettings(userIdRef.current);
  }, [loadSettings]);

  return (
    <UserSettingsContext.Provider
      value={{ settings, isLoading, isSaving, error, updateSetting, refresh }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
}