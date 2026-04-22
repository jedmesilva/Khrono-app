import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useUserSettings, type UserSettings } from "@/context/UserSettingsContext";
import {
  notificationsApi,
  pushTokensApi,
  type AppNotification,
} from "@/lib/notificationsApi";

// Show notifications when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type { AppNotification };

type NotificationsContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  pushToken: string | null;
  hasPermission: boolean;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendPushNotification: (
    profileId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    type?: string
  ) => Promise<void>;
};

type NotificationPreferenceShape = Pick<
  UserSettings,
  | "notification_push_enabled"
  | "notification_contracts_enabled"
  | "notification_schedule_enabled"
>;

function isContractNotification(type: string) {
  const normalized = type.toLowerCase();
  return normalized.includes("contract") || normalized.includes("contrato");
}

function isScheduleNotification(type: string) {
  const normalized = type.toLowerCase();
  return (
    normalized.includes("schedule") ||
    normalized.includes("agenda") ||
    normalized.includes("lembrete")
  );
}

function allowsNotificationCategory(
  type: string,
  preferences: Pick<
    NotificationPreferenceShape,
    "notification_contracts_enabled" | "notification_schedule_enabled"
  >,
) {
  if (isContractNotification(type) && !preferences.notification_contracts_enabled) {
    return false;
  }
  if (isScheduleNotification(type) && !preferences.notification_schedule_enabled) {
    return false;
  }
  return true;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  pushToken: null,
  hasPermission: false,
  loading: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  sendPushNotification: async () => {},
});

// ── Push token registration (system-level only; persistence goes via API) ────

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[Notifications] Push tokens require a physical device.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("[Notifications] Permission not granted.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Padrão",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#e06030",
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    if (!projectId) {
      console.log(
        "[Notifications] No EAS projectId configured — push delivery requires EAS setup."
      );
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("[Notifications] Push token registered:", token);
    return token;
  } catch (e) {
    console.warn("[Notifications] Failed to get Expo push token:", e);
    return null;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { settings } = useUserSettings();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const foregroundListenerRef = useRef<Notifications.Subscription | null>(null);
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    Notifications.setBadgeCountAsync(unreadCount).catch(() => {});
  }, [unreadCount]);

  // ── Load notifications via API ──────────────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.list(50);
      setNotifications(
        data.filter((n) => allowsNotificationCategory(n.type, settings)),
      );
    } catch (e) {
      console.warn("[Notifications] load error:", e);
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // ── Register push token via API ─────────────────────────────────────────────

  const clearPushTokens = useCallback(async () => {
    try {
      await pushTokensApi.clearAll();
    } catch (e) {
      console.warn("[Notifications] clear tokens error:", e);
    }
    setPushToken(null);
    setHasPermission(false);
  }, []);

  const setupPushToken = useCallback(async () => {
    if (!settings.notification_push_enabled) {
      await clearPushTokens();
      return;
    }

    const token = await registerForPushNotificationsAsync();
    setHasPermission(token !== null);
    if (!token) return;
    setPushToken(token);

    try {
      await pushTokensApi.register({
        token,
        platform: Platform.OS as "ios" | "android" | "web" | "unknown",
        notification_push_enabled: settings.notification_push_enabled,
        notification_contracts_enabled: settings.notification_contracts_enabled,
        notification_schedule_enabled: settings.notification_schedule_enabled,
      });
    } catch (e) {
      console.warn("[Notifications] register token error:", e);
    }
  }, [clearPushTokens, settings]);

  // ── Realtime — read-only subscription to my own notifications ───────────────

  const setupRealtime = useCallback((uid: string) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const ch = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${uid}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          if (!allowsNotificationCategory(newNotif.type, settings)) return;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${uid}`,
        },
        (payload) => {
          const updated = payload.new as AppNotification;
          if (!allowsNotificationCategory(updated.type, settings)) {
            setNotifications((prev) => prev.filter((n) => n.id !== updated.id));
            return;
          }
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    realtimeChannelRef.current = ch;
  }, [settings]);

  // ── Main setup effect ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setPushToken(null);
      setHasPermission(false);
      Notifications.setBadgeCountAsync(0).catch(() => {});
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    const uid = user.id;
    loadNotifications();
    setupPushToken();
    setupRealtime(uid);

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, loadNotifications, setupPushToken, setupRealtime]);

  // ── Foreground notification listener ────────────────────────────────────────

  useEffect(() => {
    foregroundListenerRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log(
          "[Notifications] Foreground:",
          notification.request.content.title
        );
      }
    );

    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        console.log("[Notifications] User tapped notification:", data);

        if (data?.contract_id) {
          router.push(`/contract-detail/${data.contract_id}` as any);
        } else {
          router.push("/(tabs)" as any);
        }
      });

    return () => {
      foregroundListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, []);

  // ── Mark as read (via API; realtime updates the UI) ─────────────────────────

  const markAsRead = useCallback(async (id: string) => {
    const optimisticTs = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: optimisticTs } : n))
    );
    try {
      await notificationsApi.markAsRead(id);
    } catch (e) {
      console.warn("[Notifications] markAsRead error:", e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    const optimisticTs = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? optimisticTs }))
    );
    try {
      await notificationsApi.markAllAsRead();
    } catch (e) {
      console.warn("[Notifications] markAllAsRead error:", e);
    }
  }, [user?.id]);

  // ── Send push to another user (via API) ─────────────────────────────────────

  const sendPushNotification = useCallback(
    async (
      profileId: string,
      title: string,
      body: string,
      data: Record<string, any> = {},
      type: string = "general"
    ) => {
      try {
        await notificationsApi.send({
          recipientId: profileId,
          title,
          body,
          data,
          type,
        });
      } catch (e) {
        console.warn("[Notifications] sendPushNotification error:", e);
      }
    },
    []
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        pushToken,
        hasPermission,
        loading,
        markAsRead,
        markAllAsRead,
        sendPushNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
