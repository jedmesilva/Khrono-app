import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type SessionStatus = "active" | "paused" | "ended" | "no_connection";

export type AvailabilitySessionDTO = {
  id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  lat: number | null;
  lng: number | null;
};

export type PinDTO = {
  id: string;
  pin: string;
  sessionId: string | null;
  qr: QRPayload;
};

export type QRPayload = {
  type: "krono-qr";
  v: number;
  pin: string;
  pid: string;
  sid: string;
  chk: string;
};

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function checksum(profileId: string, sessionId: string, pin: string): string {
  return sha256Hex(profileId + sessionId + pin).substring(0, 8);
}

function buildQR(profileId: string, sessionId: string, pin: string): QRPayload {
  return {
    type: "krono-qr",
    v: 1,
    pin,
    pid: profileId,
    sid: sessionId,
    chk: checksum(profileId, sessionId, pin),
  };
}

function mapSession(row: any): AvailabilitySessionDTO {
  return {
    id: row.id,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
  };
}

async function insertNewPin(
  profileId: string,
  sessionId: string,
): Promise<PinDTO> {
  const supabase = getSupabaseAdmin();
  for (let attempt = 0; attempt < 10; attempt++) {
    const pin = generatePin();
    const { data, error } = await supabase
      .from("provider_pins")
      .insert({ profile_id: profileId, pin, status: "active", session_id: sessionId })
      .select("id, pin, session_id")
      .single();
    if (error?.code === "23505") continue;
    if (error || !data) throw new Error(error?.message ?? "Erro ao gerar PIN.");
    return {
      id: data.id,
      pin: data.pin,
      sessionId: data.session_id ?? null,
      qr: buildQR(profileId, sessionId, data.pin),
    };
  }
  throw new Error("Não foi possível gerar PIN único.");
}

async function invalidateActivePins(
  profileId: string,
  specificPinId?: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  if (specificPinId) {
    await supabase
      .from("provider_pins")
      .update({ status: "invalidated", invalidated_at: now })
      .eq("id", specificPinId)
      .eq("profile_id", profileId);
  } else {
    await supabase
      .from("provider_pins")
      .update({ status: "invalidated", invalidated_at: now })
      .eq("profile_id", profileId)
      .eq("status", "active");
  }
}

export async function startSession(
  profileId: string,
  input: {
    lat: number | null;
    lng: number | null;
    locationAccuracy: number | null;
    metadata?: Record<string, unknown>;
  },
): Promise<{ session: AvailabilitySessionDTO; pin: PinDTO }> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("availability_sessions")
    .insert({
      profile_id: profileId,
      status: "active",
      lat: input.lat,
      lng: input.lng,
      location_accuracy: input.locationAccuracy,
      started_at: now,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao iniciar sessão.");

  await invalidateActivePins(profileId);
  const pin = await insertNewPin(profileId, data.id);
  return { session: mapSession(data), pin };
}

export async function endSession(
  profileId: string,
  sessionId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  await invalidateActivePins(profileId);
  await supabase
    .from("availability_sessions")
    .update({ status: "ended", ended_at: now })
    .eq("id", sessionId)
    .eq("profile_id", profileId);
}

export async function setSessionStatus(
  profileId: string,
  sessionId: string,
  status: "active" | "paused",
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("availability_sessions")
    .update({ status })
    .eq("id", sessionId)
    .eq("profile_id", profileId);
}

export async function regeneratePin(
  profileId: string,
  sessionId: string,
  currentPinId?: string | null,
): Promise<PinDTO> {
  if (currentPinId) {
    await invalidateActivePins(profileId, currentPinId);
  } else {
    await invalidateActivePins(profileId);
  }
  return insertNewPin(profileId, sessionId);
}

export async function markPinUsed(
  profileId: string,
  pinValue: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  await supabase
    .from("provider_pins")
    .update({ status: "used", used_at: now })
    .eq("profile_id", profileId)
    .eq("pin", pinValue)
    .eq("status", "active");
}

export async function getProfileReadiness(
  profileId: string,
): Promise<{ ready: boolean; missing: string[] }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("provider_services")
    .select("id")
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .limit(1);
  const hasService = !error && Array.isArray(data) && data.length > 0;
  const missing: string[] = [];
  if (!hasService) missing.push("Adicione pelo menos 1 serviço ativo");
  return { ready: missing.length === 0, missing };
}
