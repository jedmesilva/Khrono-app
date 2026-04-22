import { apiFetch } from "@/lib/apiClient";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
};

export const notificationsApi = {
  list(limit = 50): Promise<AppNotification[]> {
    return apiFetch<AppNotification[]>(`/api/notifications?limit=${limit}`);
  },
  markAsRead(id: string): Promise<{ ok: true; read_at: string }> {
    return apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "POST",
    });
  },
  markAllAsRead(): Promise<{ ok: true; read_at: string }> {
    return apiFetch("/api/notifications/read-all", { method: "POST" });
  },
  send(input: {
    recipientId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    type?: string;
  }): Promise<{ ok: true; pushed: number }> {
    return apiFetch("/api/notifications/send", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

export const pushTokensApi = {
  register(input: {
    token: string;
    platform: "ios" | "android" | "web" | "unknown";
    notification_push_enabled?: boolean;
    notification_contracts_enabled?: boolean;
    notification_schedule_enabled?: boolean;
  }) {
    return apiFetch("/api/push-tokens", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  clearAll() {
    return apiFetch<{ ok: true }>("/api/push-tokens", { method: "DELETE" });
  },
};
