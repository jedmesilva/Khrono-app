import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import * as ExpoLocation from "expo-location";
import { sha256 } from "js-sha256";
import * as Device from "expo-device";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionStatus =
  | "idle"       // toggle desligado, sem sessão
  | "starting"   // processando toggle ON
  | "pending"    // criado localmente, sem internet (nunca salvo no Supabase)
  | "active"     // confirmado online, salvo no Supabase
  | "paused"     // estava ativo, perdeu internet
  | "ending";    // processando toggle OFF

export type QRPayload = {
  type: "khrono-qr";
  v: number;      // schema version
  pin: string;
  pid: string;    // profileId
  sid: string;    // sessionId
  chk: string;    // sha256(pid+sid+pin)[0..8]
};

export type ProfileReadiness = {
  ready: boolean;
  missing: string[];
  checked: boolean; // false while the first check hasn't finished
};

type AvailabilityContextType = {
  status: SessionStatus;
  isAvailable: boolean;
  sessionPin: string | null;
  sessionId: string | null;
  qrPayload: QRPayload | null;
  profileReadiness: ProfileReadiness;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  regeneratePin: () => Promise<void>;
  refreshProfileReadiness: () => Promise<ProfileReadiness>;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const AvailabilityContext = createContext<AvailabilityContextType>({
  status: "idle",
  isAvailable: false,
  sessionPin: null,
  sessionId: null,
  qrPayload: null,
  profileReadiness: { ready: false, missing: [], checked: false },
  startSession: async () => {},
  endSession: async () => {},
  regeneratePin: async () => {},
  refreshProfileReadiness: async () => ({ ready: false, missing: [], checked: false }),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function makeChecksum(profileId: string, sessionId: string, pin: string): string {
  return sha256(profileId + sessionId + pin).substring(0, 8);
}

export function verifyQRChecksum(payload: QRPayload): boolean {
  try {
    return sha256(payload.pid + payload.sid + payload.pin).substring(0, 8) === payload.chk;
  } catch {
    return false;
  }
}

async function getGps(): Promise<{
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}> {
  try {
    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
    if (status !== "granted") return { lat: null, lng: null, accuracy: null };
    const pos = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    };
  } catch {
    return { lat: null, lng: null, accuracy: null };
  }
}

function getDeviceInfo(): Record<string, string | number | null> {
  return {
    device_name: Device.deviceName ?? null,
    model: Device.modelName ?? null,
    os: Device.osName ?? null,
    os_version: Device.osVersion ?? null,
    device_type: Device.deviceType ?? null,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AvailabilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPin, setSessionPin] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<QRPayload | null>(null);
  const [profileReadiness, setProfileReadiness] = useState<ProfileReadiness>({
    ready: false,
    missing: [],
    checked: false,
  });

  const statusRef = useRef<SessionStatus>("idle");
  const sessionIdRef = useRef<string | null>(null);
  const pinIdRef = useRef<string | null>(null);
  const pendingPayloadRef = useRef<Record<string, any> | null>(null);
  const profileIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  function applyStatus(s: SessionStatus) {
    statusRef.current = s;
    setStatus(s);
  }
  function applySessionId(id: string | null) {
    sessionIdRef.current = id;
    setSessionId(id);
  }

  // ── Profile readiness check ────────────────────────────────────────────────
  const refreshProfileReadiness = useCallback(async (): Promise<ProfileReadiness> => {
    const profileId = profileIdRef.current;
    if (!profileId) {
      const result: ProfileReadiness = { ready: false, missing: ["Adicione pelo menos 1 serviço"], checked: true };
      setProfileReadiness(result);
      return result;
    }

    const { data, error } = await supabase
      .from("provider_services")
      .select("id")
      .eq("profile_id", profileId)
      .eq("is_active", true)
      .limit(1);

    const hasService = !error && Array.isArray(data) && data.length > 0;
    const missing: string[] = [];
    if (!hasService) missing.push("Adicione pelo menos 1 serviço ativo");

    const result: ProfileReadiness = { ready: missing.length === 0, missing, checked: true };
    setProfileReadiness(result);
    return result;
  }, []);

  // ── Load current user ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      profileIdRef.current = user?.id ?? null;
      if (user?.id) refreshProfileReadiness();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        profileIdRef.current = session?.user?.id ?? null;
        if (!session) {
          applyStatus("idle");
          applySessionId(null);
          setSessionPin(null);
          setQrPayload(null);
          pinIdRef.current = null;
          pendingPayloadRef.current = null;
          teardownRealtimePin();
          setProfileReadiness({ ready: false, missing: [], checked: false });
        } else {
          refreshProfileReadiness();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [refreshProfileReadiness]);

  // ── Realtime PIN subscription ──────────────────────────────────────────────

  function setupRealtimePin(profileId: string) {
    teardownRealtimePin();

    const channel = supabase
      .channel(`pin-watch-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "provider_pins",
          filter: `profile_id=eq.${profileId}`,
        },
        async (payload: any) => {
          if (payload.new?.status === "used") {
            await insertNewPin(profileId, sessionIdRef.current);
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  }

  function teardownRealtimePin() {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }

  // ── Insert a new active PIN and build QR payload ───────────────────────────
  async function insertNewPin(
    profileId: string,
    sessionId: string | null
  ): Promise<string | null> {
    const pin = generatePin();

    const { data, error } = await supabase
      .from("provider_pins")
      .insert({
        profile_id: profileId,
        pin,
        status: "active",
        session_id: sessionId,
      })
      .select("id")
      .single();

    if (error || !data) return null;

    pinIdRef.current = data.id;
    setSessionPin(pin);

    // Build QR payload with checksum (only possible when sessionId is known)
    if (sessionId) {
      const chk = makeChecksum(profileId, sessionId, pin);
      setQrPayload({
        type: "khrono-qr",
        v: 1,
        pin,
        pid: profileId,
        sid: sessionId,
        chk,
      });
    } else {
      setQrPayload(null);
    }

    return pin;
  }

  // ── Invalidate a specific PIN or all active PINs ───────────────────────────
  async function invalidatePins(
    profileId: string,
    specificPinId?: string | null
  ) {
    const now = new Date().toISOString();
    if (specificPinId) {
      await supabase
        .from("provider_pins")
        .update({ status: "invalidated", invalidated_at: now })
        .eq("id", specificPinId);
    } else {
      await supabase
        .from("provider_pins")
        .update({ status: "invalidated", invalidated_at: now })
        .eq("profile_id", profileId)
        .eq("status", "active");
    }
  }

  // ── Polling fallback: detecta PIN usado quando realtime não dispara ──────────
  // Sem REPLICA IDENTITY FULL na tabela provider_pins, o filtro de UPDATE
  // por profile_id não funciona no WAL (só o PK + colunas alteradas são enviados).
  // Este polling verifica o PIN ativo a cada 10 s e regenera se foi consumido.
  useEffect(() => {
    if (status !== "active") return;

    const interval = setInterval(async () => {
      const pinId = pinIdRef.current;
      const profileId = profileIdRef.current;
      const sessionId = sessionIdRef.current;
      if (!pinId || !profileId) return;

      const { data } = await supabase
        .from("provider_pins")
        .select("status")
        .eq("id", pinId)
        .single();

      if (data?.status === "used" || data?.status === "invalidated") {
        pinIdRef.current = null;
        setQrPayload(null);
        await insertNewPin(profileId, sessionId);
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [status]);

  // ── Network listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = state.isConnected && state.isInternetReachable !== false;

      if (!online) {
        if (statusRef.current === "active") {
          applyStatus("paused");
          if (sessionIdRef.current) {
            supabase
              .from("availability_sessions")
              .update({ status: "paused" })
              .eq("id", sessionIdRef.current)
              .then(() => {});
          }
        }
        return;
      }

      const cur = statusRef.current;
      const profileId = profileIdRef.current;
      if (!profileId) return;

      if (cur === "pending" && pendingPayloadRef.current) {
        const payload = { ...pendingPayloadRef.current, status: "active" };
        const { data, error } = await supabase
          .from("availability_sessions")
          .insert(payload)
          .select("id")
          .single();

        if (!error && data) {
          pendingPayloadRef.current = null;
          applySessionId(data.id);
          // Invalidate the locally-generated PIN (no DB row) and create a proper one
          setQrPayload(null);
          await insertNewPin(profileId, data.id);
          setupRealtimePin(profileId);
          applyStatus("active");
        }
        return;
      }

      if (cur === "paused" && sessionIdRef.current) {
        const { error } = await supabase
          .from("availability_sessions")
          .update({ status: "active" })
          .eq("id", sessionIdRef.current);
        if (!error) {
          applyStatus("active");
        }
        return;
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Start session ──────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    const profileId = profileIdRef.current;
    if (!profileId) return;
    if (statusRef.current !== "idle") return;

    applyStatus("starting");

    const [netState, gps] = await Promise.all([NetInfo.fetch(), getGps()]);
    const online =
      netState.isConnected && netState.isInternetReachable !== false;
    const now = new Date().toISOString();
    const deviceInfo = getDeviceInfo();

    const sessionPayload = {
      profile_id: profileId,
      lat: gps.lat,
      lng: gps.lng,
      location_accuracy: gps.accuracy,
      started_at: now,
      metadata: { device: deviceInfo },
    };

    if (!online) {
      pendingPayloadRef.current = sessionPayload;
      const pin = generatePin();
      setSessionPin(pin);
      setQrPayload(null); // QR unavailable offline (no sessionId yet)
      applyStatus("pending");
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from("availability_sessions")
      .insert({ ...sessionPayload, status: "active" })
      .select("id")
      .single();

    if (sessionError || !sessionData) {
      pendingPayloadRef.current = sessionPayload;
      const pin = generatePin();
      setSessionPin(pin);
      setQrPayload(null);
      applyStatus("pending");
      return;
    }

    applySessionId(sessionData.id);
    await insertNewPin(profileId, sessionData.id);
    setupRealtimePin(profileId);
    applyStatus("active");
  }, []);

  // ── End session ────────────────────────────────────────────────────────────
  const endSession = useCallback(async () => {
    const cur = statusRef.current;
    if (cur === "idle") return;

    applyStatus("ending");

    const now = new Date().toISOString();
    const id = sessionIdRef.current;
    const profileId = profileIdRef.current;

    if (profileId) {
      await invalidatePins(profileId);
    }

    if (id) {
      await supabase
        .from("availability_sessions")
        .update({ status: "ended", ended_at: now })
        .eq("id", id);
    }

    if ((cur === "pending" || cur === "paused") && !id && pendingPayloadRef.current && profileId) {
      await supabase
        .from("availability_sessions")
        .insert({ ...pendingPayloadRef.current, status: "no_connection", ended_at: now })
        .then(() => {});
    }

    teardownRealtimePin();
    pendingPayloadRef.current = null;
    pinIdRef.current = null;
    applySessionId(null);
    setSessionPin(null);
    setQrPayload(null);
    applyStatus("idle");
  }, []);

  // ── Regenerate PIN ─────────────────────────────────────────────────────────
  const regeneratePin = useCallback(async () => {
    const profileId = profileIdRef.current;
    if (!profileId) return;
    const cur = statusRef.current;
    if (cur !== "active" && cur !== "pending") return;

    if (pinIdRef.current) {
      await invalidatePins(profileId, pinIdRef.current);
    }
    pinIdRef.current = null;
    setQrPayload(null);

    if (cur === "active") {
      await insertNewPin(profileId, sessionIdRef.current);
    } else {
      const pin = generatePin();
      setSessionPin(pin);
    }
  }, []);

  const isAvailable = status === "active";

  return (
    <AvailabilityContext.Provider
      value={{
        status,
        isAvailable,
        sessionPin,
        sessionId,
        qrPayload,
        profileReadiness,
        startSession,
        endSession,
        regeneratePin,
        refreshProfileReadiness,
      }}
    >
      {children}
    </AvailabilityContext.Provider>
  );
}

export function useAvailability() {
  return useContext(AvailabilityContext);
}
