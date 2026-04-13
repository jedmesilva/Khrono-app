import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
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

// Show notifications when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
};

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

// ── Push token registration ───────────────────────────────────────────────────

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

    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    console.log("[Notifications] Push token registered:", token);
    return token;
  } catch (e) {
    console.warn("[Notifications] Failed to get Expo push token:", e);
    return null;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const foregroundListenerRef = useRef<Notifications.Subscription | null>(null);
  const responsListenerRef = useRef<Notifications.Subscription | null>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // ── Load notifications from Supabase ────────────────────────────────────────

  const loadNotifications = useCallback(async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as AppNotification[]);
    }
    setLoading(false);
  }, []);

  // ── Register push token in Supabase ─────────────────────────────────────────

  const setupPushToken = useCallback(async (uid: string) => {
    const token = await registerForPushNotificationsAsync();
    setHasPermission(token !== null);
    if (!token) return;

    setPushToken(token);

    await supabase.from("push_tokens").upsert(
      {
        profile_id: uid,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,token" }
    );
  }, []);

  // ── Supabase Realtime subscription ──────────────────────────────────────────

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
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    realtimeChannelRef.current = ch;
  }, []);

  // ── Main setup effect ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setPushToken(null);
      setHasPermission(false);
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    const uid = user.id;
    loadNotifications(uid);
    setupPushToken(uid);
    setupRealtime(uid);

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id]);

  // ── Foreground notification listener ────────────────────────────────────────

  useEffect(() => {
    foregroundListenerRef.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "[Notifications] Foreground:",
          notification.request.content.title
        );
      });

    responsListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          any
        >;
        console.log("[Notifications] User tapped notification:", data);
      });

    return () => {
      if (foregroundListenerRef.current) {
        Notifications.removeNotificationSubscription(
          foregroundListenerRef.current
        );
      }
      if (responsListenerRef.current) {
        Notifications.removeNotificationSubscription(
          responsListenerRef.current
        );
      }
    };
  }, []);

  // ── Mark as read ─────────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("profile_id", user.id)
      .is("read_at", null);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? now }))
    );
  }, [user?.id]);

  // ── Send push notification to another user ───────────────────────────────────
  // 1. Stores the notification in Supabase (recipient sees it in the sheet)
  // 2. Looks up the recipient's Expo push token
  // 3. Calls the Expo Push API to deliver the push notification

  const sendPushNotification = useCallback(
    async (
      profileId: string,
      title: string,
      body: string,
      data: Record<string, any> = {},
      type: string = "general"
    ) => {
      // 1. Store in-app notification
      const { error: insertErr } = await supabase
        .from("notifications")
        .insert({ profile_id: profileId, type, title, body, data });

      if (insertErr) {
        console.warn(
          "[Notifications] Failed to insert notification:",
          insertErr.message
        );
      }

      // 2. Look up push token(s) for the recipient
      const { data: tokenRows } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("profile_id", profileId);

      if (!tokenRows || tokenRows.length === 0) return;

      const validTokens = tokenRows
        .map((r: { token: string }) => r.token)
        .filter((t) => t.startsWith("ExponentPushToken"));

      if (validTokens.length === 0) return;

      // 3. Deliver via Expo Push API
      try {
        const messages = validTokens.map((token) => ({
          to: token,
          title,
          body,
          data,
          sound: "default" as const,
          priority: "high" as const,
        }));

        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify(messages),
        });
      } catch (e) {
        console.warn("[Notifications] Expo Push API error:", e);
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
