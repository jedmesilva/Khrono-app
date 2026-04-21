import { supabase } from "@/lib/supabase";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type AuditSnapshot = {
  device_id?: string | null;
  device_platform?: string | null;
  app_version?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_meters?: number | null;
};

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error("EXPO_PUBLIC_API_URL não está configurado.");
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

type Parties = { contractorId: string | null; hiredId: string | null };

export type CreateDraftInput = {
  hiredProfileId: string;
  type: "timer" | "cronometro";
  ratePerHour: number;
  duracaoTotalMs?: number | null;
  serviceId?: string | null;
  paymentMethod?: string | null;
  paymentCardLabel?: string | null;
  agendado?: boolean;
  scheduledForMs?: number | null;
  location?: string | null;
  distanceKm?: number | null;
};

export const contractsApi = {
  createDraft(input: CreateDraftInput) {
    return authedFetch<{ id: string }>("/api/contracts/draft", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  processPayment(
    contractId: string,
    body: { method: string; amount: number; stripePaymentIntentId?: string; pixPaymentIntentId?: string },
  ) {
    return authedFetch<{ paymentId: string }>(
      `/api/contracts/${encodeURIComponent(contractId)}/payment`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },
  finalize(contractId: string, audit?: AuditSnapshot) {
    return authedFetch<{ hiredId: string; serviceName: string }>(
      `/api/contracts/${encodeURIComponent(contractId)}/finalize`,
      { method: "POST", body: JSON.stringify({ audit }) },
    );
  },
  deleteDraft(contractId: string) {
    return authedFetch<{ ok: true }>(
      `/api/contracts/${encodeURIComponent(contractId)}`,
      { method: "DELETE" },
    );
  },
  startNow(input: CreateDraftInput & { initialStatus?: "active" | "pending_signature" }, audit?: AuditSnapshot) {
    return authedFetch<{ id: string; needsCardIntent: boolean; preAmount: number; payeeId: string | null }>(
      "/api/contracts/start-now",
      { method: "POST", body: JSON.stringify({ ...input, audit }) },
    );
  },
  accept(contractId: string, audit?: AuditSnapshot) {
    return authedFetch<Parties>(`/api/contracts/${encodeURIComponent(contractId)}/accept`, {
      method: "POST",
      body: JSON.stringify({ audit }),
    });
  },
  reject(contractId: string, audit?: AuditSnapshot) {
    return authedFetch<Parties>(`/api/contracts/${encodeURIComponent(contractId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ audit }),
    });
  },
  begin(contractId: string, audit?: AuditSnapshot) {
    return authedFetch<Parties>(`/api/contracts/${encodeURIComponent(contractId)}/begin`, {
      method: "POST",
      body: JSON.stringify({ audit }),
    });
  },
  cancelNow(contractId: string, audit?: AuditSnapshot) {
    return authedFetch<Parties>(`/api/contracts/${encodeURIComponent(contractId)}/cancel-now`, {
      method: "POST",
      body: JSON.stringify({ audit }),
    });
  },
  requestEnd(contractId: string, reason: string, audit?: AuditSnapshot) {
    return authedFetch<Parties>(`/api/contracts/${encodeURIComponent(contractId)}/request-end`, {
      method: "POST",
      body: JSON.stringify({ reason, audit }),
    });
  },
  rejectEnd(contractId: string, audit?: AuditSnapshot) {
    return authedFetch<Parties>(`/api/contracts/${encodeURIComponent(contractId)}/reject-end`, {
      method: "POST",
      body: JSON.stringify({ audit }),
    });
  },
  requestCancel(contractId: string, reason: string, audit?: AuditSnapshot) {
    return authedFetch<Parties>(`/api/contracts/${encodeURIComponent(contractId)}/request-cancel`, {
      method: "POST",
      body: JSON.stringify({ reason, audit }),
    });
  },
  confirmCancel(contractId: string, reason: string, audit?: AuditSnapshot) {
    return authedFetch<Parties>(`/api/contracts/${encodeURIComponent(contractId)}/confirm-cancel`, {
      method: "POST",
      body: JSON.stringify({ reason, audit }),
    });
  },
  rejectCancel(contractId: string, reason: string | undefined, audit?: AuditSnapshot) {
    return authedFetch<Parties>(`/api/contracts/${encodeURIComponent(contractId)}/reject-cancel`, {
      method: "POST",
      body: JSON.stringify({ reason, audit }),
    });
  },
  cashPaid(contractId: string, amountReported: number, audit?: AuditSnapshot) {
    return authedFetch<Parties & { amountsMatch: boolean }>(
      `/api/contracts/${encodeURIComponent(contractId)}/cash-paid`,
      { method: "POST", body: JSON.stringify({ amountReported, audit }) },
    );
  },
  cashReceived(contractId: string, amountReceived: number, isIncomplete: boolean, audit?: AuditSnapshot) {
    return authedFetch<Parties & { amountsMatch: boolean }>(
      `/api/contracts/${encodeURIComponent(contractId)}/cash-received`,
      { method: "POST", body: JSON.stringify({ amountReceived, isIncomplete, audit }) },
    );
  },
  confirmCash(contractId: string, audit?: AuditSnapshot) {
    return authedFetch<Parties & { confirmed: boolean; paymentId: string }>(
      `/api/contracts/${encodeURIComponent(contractId)}/confirm-cash`,
      { method: "POST", body: JSON.stringify({ audit }) },
    );
  },
  disputeCash(contractId: string, reason: string, audit?: AuditSnapshot) {
    return authedFetch<Parties & { paymentId: string; againstUserId: string | null }>(
      `/api/contracts/${encodeURIComponent(contractId)}/dispute-cash`,
      { method: "POST", body: JSON.stringify({ reason, audit }) },
    );
  },
  changePaymentMethod(contractId: string, newMethod: string, cardLabel: string | undefined, audit?: AuditSnapshot) {
    return authedFetch<Parties>(
      `/api/contracts/${encodeURIComponent(contractId)}/payment-method`,
      { method: "POST", body: JSON.stringify({ newMethod, cardLabel, audit }) },
    );
  },
  payPending(contractId: string, audit?: AuditSnapshot) {
    return authedFetch<Parties>(
      `/api/contracts/${encodeURIComponent(contractId)}/pay-pending`,
      { method: "POST", body: JSON.stringify({ audit }) },
    );
  },
};
