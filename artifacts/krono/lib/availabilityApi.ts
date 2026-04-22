import { apiFetch } from "@/lib/apiClient";

export type SessionStatus = "active" | "paused" | "ended" | "no_connection";

export type AvailabilitySessionDTO = {
  id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  lat: number | null;
  lng: number | null;
};

export type QRPayload = {
  type: "krono-qr";
  v: number;
  pin: string;
  pid: string;
  sid: string;
  chk: string;
};

export type PinDTO = {
  id: string;
  pin: string;
  sessionId: string | null;
  qr: QRPayload;
};

export const availabilityApi = {
  startSession(input: {
    lat: number | null;
    lng: number | null;
    locationAccuracy: number | null;
    metadata?: Record<string, unknown>;
  }) {
    return apiFetch<{ session: AvailabilitySessionDTO; pin: PinDTO }>(
      "/api/availability/sessions/start",
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  endSession(sessionId: string) {
    return apiFetch<{ ok: true }>(
      `/api/availability/sessions/${encodeURIComponent(sessionId)}/end`,
      { method: "POST" },
    );
  },
  pauseSession(sessionId: string) {
    return apiFetch<{ ok: true }>(
      `/api/availability/sessions/${encodeURIComponent(sessionId)}/pause`,
      { method: "POST" },
    );
  },
  resumeSession(sessionId: string) {
    return apiFetch<{ ok: true }>(
      `/api/availability/sessions/${encodeURIComponent(sessionId)}/resume`,
      { method: "POST" },
    );
  },
  regeneratePin(sessionId: string, currentPinId?: string | null) {
    return apiFetch<PinDTO>(
      `/api/availability/sessions/${encodeURIComponent(sessionId)}/regenerate-pin`,
      { method: "POST", body: JSON.stringify({ currentPinId }) },
    );
  },
  notifyPinUsed(profileId: string, pin: string) {
    return apiFetch<{ ok: true }>("/api/availability/pins/used", {
      method: "POST",
      body: JSON.stringify({ profileId, pin }),
    });
  },
  getProfileReadiness() {
    return apiFetch<{ ready: boolean; missing: string[] }>(
      "/api/availability/profile-readiness",
    );
  },
};

export function verifyQRChecksum(_payload: QRPayload): boolean {
  // Note: checksum verification is now done server-side when a PIN is consumed.
  // Client-side verification kept as a no-op stub for backward compatibility.
  return true;
}
