import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { settingsApi, type UserSettings } from "@/lib/settingsApi";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { setHapticsEnabled } from "@/lib/haptics";

export type { UserSettings };

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

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const { setThemeMode } = useTheme();

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await settingsApi.get();
      setSettings(loaded);
      setThemeMode(loaded.theme_preference);
      setHapticsEnabled(loaded.haptics_enabled);
    } catch (e) {
      console.warn("[UserSettingsContext] loadSettings error:", e);
      setError("Não foi possível carregar suas definições.");
    } finally {
      setIsLoading(false);
    }
  }, [setThemeMode]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userIdRef.current = user.id;
        loadSettings();
      } else {
        userIdRef.current = null;
        setSettings(DEFAULT_SETTINGS);
        setHapticsEnabled(DEFAULT_SETTINGS.haptics_enabled);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          userIdRef.current = session.user.id;
          loadSettings();
        } else {
          userIdRef.current = null;
          setSettings(DEFAULT_SETTINGS);
          setHapticsEnabled(DEFAULT_SETTINGS.haptics_enabled);
          setError(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadSettings]);

  const updateSetting = useCallback(
    async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      if (!userIdRef.current) return;

      const previous = settings;
      const next = { ...settings, [key]: value };

      setSettings(next);
      setError(null);
      setIsSaving(true);

      if (key === "theme_preference") {
        setThemeMode(value as ThemePreference);
      }
      if (key === "haptics_enabled") {
        setHapticsEnabled(Boolean(value));
      }

      try {
        const saved = await settingsApi.patch({ [key]: value } as Partial<UserSettings>);
        setSettings(saved);
      } catch (e) {
        console.warn("[UserSettingsContext] updateSetting error:", e);
        setSettings(previous);
        if (key === "theme_preference") {
          setThemeMode(previous.theme_preference);
        }
        if (key === "haptics_enabled") {
          setHapticsEnabled(previous.haptics_enabled);
        }
        setError("Não foi possível salvar esta definição.");
      } finally {
        setIsSaving(false);
      }
    },
    [settings, setThemeMode]
  );

  const refresh = useCallback(async () => {
    if (userIdRef.current) await loadSettings();
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
