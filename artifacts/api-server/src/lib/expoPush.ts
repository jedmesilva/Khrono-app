export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  priority?: "high" | "default";
  badge?: number;
};

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // best-effort delivery — we don't want push failures to break the request
  }
}

export function isContractNotification(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes("contract") || t.includes("contrato");
}

export function isScheduleNotification(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes("schedule") || t.includes("agenda") || t.includes("lembrete");
}
