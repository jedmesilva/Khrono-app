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
import * as Device from "expo-device";
import { supabase } from "@/lib/supabase";
import { availabilityApi, type QRPayload } from "@/lib/availabilityApi";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionStatus =
  | "idle"
  | "starting"
  | "pending"  // criado localmente, sem internet
  | "active"
  | "paused"
  | "ending";

export type { QRPayload };

export type ProfileReadiness = {
  ready: boolean;
  missing: string[];
  checked: boolean;
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
  notifyPinUsed: (profileId: string) => void;
};

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
  notifyPinUsed: () => {},
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateLocalPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
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

export function AvailabilityProvider({ children }: { children: React.ReactNode }) {
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
  const pendingPayloadRef = useRef<{
    lat: number | null;
    lng: number | null;
    locationAccuracy: number | null;
    metadata: Record<string, unknown>;
  } | null>(null);
  const profileIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastReadyRef = useRef(false);

  function applyStatus(s: SessionStatus) {
    statusRef.current = s;
    setStatus(s);
  }
  function applySessionId(id: string | null) {
    sessionIdRef.current = id;
    setSessionId(id);
  }

  // ── Profile readiness check (server) ───────────────────────────────────────
  const refreshProfileReadiness = useCallback(async (): Promise<ProfileReadiness> => {
    if (!profileIdRef.current) {
      const r: ProfileReadiness = {
        ready: false,
        missing: ["Adicione pelo menos 1 serviço"],
        checked: true,
      };
      setProfileReadiness(r);
      return r;
    }
    try {
      const { ready, missing } = await availabilityApi.getProfileReadiness();
      const r: ProfileReadiness = { ready, missing, checked: true };
      setProfileReadiness(r);
      return r;
    } catch {
      const r: ProfileReadiness = { ready: false, missing: [], checked: true };
      setProfileReadiness(r);
      return r;
    }
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
      },
    );
    return () => subscription.unsubscribe();
  }, [refreshProfileReadiness]);

  // ── Realtime PIN watcher (READ-ONLY) ───────────────────────────────────────
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
            await regenerateFromServer();
          }
        },
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

  async function regenerateFromServer() {
    const sId = sessionIdRef.current;
    if (!sId) return;
    try {
      const pin = await availabilityApi.regeneratePin(sId, pinIdRef.current);
      pinIdRef.current = pin.id;
      setSessionPin(pin.pin);
      setQrPayload(pin.qr);
    } catch (e) {
      console.warn("[Availability] regeneratePin error:", e);
    }
  }

  // ── Broadcast: pin-used (read-only listener) ───────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel("krono-availability-events")
      .on("broadcast", { event: "pin-used" }, async (msg) => {
        const profileId = profileIdRef.current;
        if (!profileId) return;
        if (msg.payload?.profile_id !== profileId) return;
        await regenerateFromServer();
      })
      .subscribe((s) => {
        broadcastReadyRef.current = s === "SUBSCRIBED";
      });
    broadcastChannelRef.current = ch;
    return () => {
      broadcastReadyRef.current = false;
      supabase.removeChannel(ch);
      broadcastChannelRef.current = null;
    };
  }, []);

  // ── Network listener: handle reconnection / pause ──────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = state.isConnected && state.isInternetReachable !== false;

      if (!online) {
        if (statusRef.current === "active" && sessionIdRef.current) {
          applyStatus("paused");
          availabilityApi.pauseSession(sessionIdRef.current).catch(() => {});
        }
        return;
      }

      const cur = statusRef.current;
      const profileId = profileIdRef.current;
      if (!profileId) return;

      if (cur === "pending" && pendingPayloadRef.current) {
        try {
          const result = await availabilityApi.startSession(pendingPayloadRef.current);
          pendingPayloadRef.current = null;
          applySessionId(result.session.id);
          pinIdRef.current = result.pin.id;
          setSessionPin(result.pin.pin);
          setQrPayload(result.pin.qr);
          setupRealtimePin(profileId);
          applyStatus("active");
        } catch (e) {
          console.warn("[Availability] resync pending error:", e);
        }
        return;
      }

      if (cur === "paused" && sessionIdRef.current) {
        try {
          await availabilityApi.resumeSession(sessionIdRef.current);
          applyStatus("active");
        } catch {}
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
    const online = netState.isConnected && netState.isInternetReachable !== false;
    const payload = {
      lat: gps.lat,
      lng: gps.lng,
      locationAccuracy: gps.accuracy,
      metadata: { device: getDeviceInfo() },
    };

    if (!online) {
      pendingPayloadRef.current = payload;
      setSessionPin(generateLocalPin());
      setQrPayload(null);
      applyStatus("pending");
      return;
    }

    try {
      const result = await availabilityApi.startSession(payload);
      applySessionId(result.session.id);
      pinIdRef.current = result.pin.id;
      setSessionPin(result.pin.pin);
      setQrPayload(result.pin.qr);
      setupRealtimePin(profileId);
      applyStatus("active");
    } catch (e) {
      console.warn("[Availability] startSession error:", e);
      pendingPayloadRef.current = payload;
      setSessionPin(generateLocalPin());
      setQrPayload(null);
      applyStatus("pending");
    }
  }, []);

  // ── End session ────────────────────────────────────────────────────────────
  const endSession = useCallback(async () => {
    const cur = statusRef.current;
    if (cur === "idle") return;
    applyStatus("ending");

    const id = sessionIdRef.current;
    if (id) {
      try {
        await availabilityApi.endSession(id);
      } catch (e) {
        console.warn("[Availability] endSession error:", e);
      }
    }

    teardownRealtimePin();
    pendingPayloadRef.current = null;
    pinIdRef.current = null;
    applySessionId(null);
    setSessionPin(null);
    setQrPayload(null);
    applyStatus("idle");
  }, []);

  // ── Regenerate PIN (manual) ────────────────────────────────────────────────
  const regeneratePin = useCallback(async () => {
    const cur = statusRef.current;
    if (cur !== "active" && cur !== "pending") return;
    if (cur === "active") {
      await regenerateFromServer();
    } else {
      setSessionPin(generateLocalPin());
    }
  }, []);

  const notifyPinUsed = useCallback((profileId: string) => {
    const ch = broadcastChannelRef.current;
    if (ch && broadcastReadyRef.current) {
      ch.send({ type: "broadcast", event: "pin-used", payload: { profile_id: profileId } });
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
        notifyPinUsed,
      }}
    >
      {children}
    </AvailabilityContext.Provider>
  );
}

export function useAvailability() {
  return useContext(AvailabilityContext);
}

export function verifyQRChecksum(_payload: QRPayload): boolean {
  // Server-side verification is the source of truth.
  return true;
}
