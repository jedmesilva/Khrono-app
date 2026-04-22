import { apiFetch } from "@/lib/apiClient";
import type { ThemePreference } from "@/context/ThemeContext";

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

export const settingsApi = {
  get(): Promise<UserSettings> {
    return apiFetch<UserSettings>("/api/settings");
  },
  patch(partial: Partial<UserSettings>): Promise<UserSettings> {
    return apiFetch<UserSettings>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(partial),
    });
  },
};
