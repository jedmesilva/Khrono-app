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
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionStatus =
  | "idle"       // toggle desligado, sem sessão
  | "starting"   // processando toggle ON
  | "pending"    // criado localmente, sem internet (nunca salvo no Supabase)
  | "active"     // confirmado online, salvo no Supabase
  | "paused"     // estava ativo, perdeu internet
  | "ending";    // processando toggle OFF

type AvailabilityContextType = {
  status: SessionStatus;
  isAvailable: boolean;
  sessionPin: string | null;
  sessionId: string | null;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const AvailabilityContext = createContext<AvailabilityContextType>({
  status: "idle",
  isAvailable: false,
  sessionPin: null,
  sessionId: null,
  startSession: async () => {},
  endSession: async () => {},
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePin(): string {
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

// ─── Provider ────────────────────────────────────────────────────────────────

export function AvailabilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPin, setSessionPin] = useState<string | null>(null);

  // Refs so NetInfo listener always has the latest values without re-subscribing
  const statusRef = useRef<SessionStatus>("idle");
  const sessionIdRef = useRef<string | null>(null);
  const pendingPayloadRef = useRef<Record<string, any> | null>(null);
  const profileIdRef = useRef<string | null>(null);

  function applyStatus(s: SessionStatus) {
    statusRef.current = s;
    setStatus(s);
  }
  function applySessionId(id: string | null) {
    sessionIdRef.current = id;
    setSessionId(id);
  }

  // ── Load current user ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      profileIdRef.current = user?.id ?? null;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        profileIdRef.current = session?.user?.id ?? null;
        // End any active session when user logs out
        if (!session) {
          applyStatus("idle");
          applySessionId(null);
          setSessionPin(null);
          pendingPayloadRef.current = null;
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Network listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = state.isConnected && state.isInternetReachable !== false;

      if (!online) {
        // Lost connection while active → pause
        if (statusRef.current === "active") {
          applyStatus("paused");
          // Best-effort update to Supabase (may fail — that's fine)
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

      // ── Reconnected ──────────────────────────────────────────────────────
      const cur = statusRef.current;

      if (cur === "pending" && pendingPayloadRef.current) {
        // Had a session that was never saved → insert now as active
        const payload = { ...pendingPayloadRef.current, status: "active" };
        const { data, error } = await supabase
          .from("availability_sessions")
          .insert(payload)
          .select("id")
          .single();
        if (!error && data) {
          pendingPayloadRef.current = null;
          applySessionId(data.id);
          applyStatus("active");
        }
        return;
      }

      if (cur === "paused" && sessionIdRef.current) {
        // Had an active session that was paused → re-activate
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

    const pin = generatePin();
    setSessionPin(pin);

    const [netState, gps] = await Promise.all([NetInfo.fetch(), getGps()]);
    const online =
      netState.isConnected && netState.isInternetReachable !== false;
    const now = new Date().toISOString();

    const payload = {
      profile_id: profileId,
      session_pin: pin,
      lat: gps.lat,
      lng: gps.lng,
      location_accuracy: gps.accuracy,
      started_at: now,
    };

    if (!online) {
      // Save locally — will sync when internet is restored
      pendingPayloadRef.current = payload;
      applyStatus("pending");
      return;
    }

    // Insert directly as active
    const { data, error } = await supabase
      .from("availability_sessions")
      .insert({ ...payload, status: "active" })
      .select("id")
      .single();

    if (error || !data) {
      // Couldn't save — treat as pending
      pendingPayloadRef.current = payload;
      applyStatus("pending");
      return;
    }

    applySessionId(data.id);
    applyStatus("active");
  }, []);

  // ── End session ────────────────────────────────────────────────────────────
  const endSession = useCallback(async () => {
    const cur = statusRef.current;
    if (cur === "idle") return;

    applyStatus("ending");

    const now = new Date().toISOString();
    const id = sessionIdRef.current;

    if (id) {
      await supabase
        .from("availability_sessions")
        .update({ status: "ended", ended_at: now })
        .eq("id", id);
    }

    // If still pending (never synced), record it as no_connection for history
    if ((cur === "pending" || cur === "paused") && !id && pendingPayloadRef.current) {
      await supabase
        .from("availability_sessions")
        .insert({ ...pendingPayloadRef.current, status: "no_connection", ended_at: now })
        .then(() => {});
    }

    pendingPayloadRef.current = null;
    applySessionId(null);
    setSessionPin(null);
    applyStatus("idle");
  }, []);

  const isAvailable = status === "active";

  return (
    <AvailabilityContext.Provider
      value={{ status, isAvailable, sessionPin, sessionId, startSession, endSession }}
    >
      {children}
    </AvailabilityContext.Provider>
  );
}

export function useAvailability() {
  return useContext(AvailabilityContext);
}
