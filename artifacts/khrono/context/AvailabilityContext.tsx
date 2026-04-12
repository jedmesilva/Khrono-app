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
  regeneratePin: () => Promise<void>;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const AvailabilityContext = createContext<AvailabilityContextType>({
  status: "idle",
  isAvailable: false,
  sessionPin: null,
  sessionId: null,
  startSession: async () => {},
  endSession: async () => {},
  regeneratePin: async () => {},
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

  // Refs — always hold the latest values for use inside callbacks/listeners
  const statusRef = useRef<SessionStatus>("idle");
  const sessionIdRef = useRef<string | null>(null);
  const pinIdRef = useRef<string | null>(null);          // DB id of the current active PIN row
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

  // ── Load current user ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      profileIdRef.current = user?.id ?? null;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        profileIdRef.current = session?.user?.id ?? null;
        if (!session) {
          applyStatus("idle");
          applySessionId(null);
          setSessionPin(null);
          pinIdRef.current = null;
          pendingPayloadRef.current = null;
          teardownRealtimePin();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Realtime PIN subscription ──────────────────────────────────────────────
  // Watches for when a contractor marks our PIN as "used" so we auto-regenerate

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
            // A contractor used our PIN → generate a fresh one automatically
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

  // ── Insert a new active PIN into the DB ────────────────────────────────────
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
    return pin;
  }

  // ── Invalidate a specific PIN or all active PINs for the user ─────────────
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
      // Invalidate ALL active PINs for this user (session end)
      await supabase
        .from("provider_pins")
        .update({ status: "invalidated", invalidated_at: now })
        .eq("profile_id", profileId)
        .eq("status", "active");
    }
  }

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

      // ── Reconnected ────────────────────────────────────────────────────────
      const cur = statusRef.current;
      const profileId = profileIdRef.current;
      if (!profileId) return;

      if (cur === "pending" && pendingPayloadRef.current) {
        // Session was never saved → insert now
        const payload = { ...pendingPayloadRef.current, status: "active" };
        const { data, error } = await supabase
          .from("availability_sessions")
          .insert(payload)
          .select("id")
          .single();

        if (!error && data) {
          pendingPayloadRef.current = null;
          applySessionId(data.id);
          // Now save the PIN that was generated locally
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

    const sessionPayload = {
      profile_id: profileId,
      lat: gps.lat,
      lng: gps.lng,
      location_accuracy: gps.accuracy,
      started_at: now,
    };

    if (!online) {
      // Store locally; generate PIN locally to show user, will sync on reconnect
      pendingPayloadRef.current = sessionPayload;
      const pin = generatePin();
      setSessionPin(pin);
      applyStatus("pending");
      return;
    }

    // Insert session
    const { data: sessionData, error: sessionError } = await supabase
      .from("availability_sessions")
      .insert({ ...sessionPayload, status: "active" })
      .select("id")
      .single();

    if (sessionError || !sessionData) {
      // Fallback to pending
      pendingPayloadRef.current = sessionPayload;
      const pin = generatePin();
      setSessionPin(pin);
      applyStatus("pending");
      return;
    }

    applySessionId(sessionData.id);

    // Insert PIN linked to this session
    await insertNewPin(profileId, sessionData.id);

    // Start watching for PIN usage
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

    // Invalidate all active PINs for this user
    if (profileId) {
      await invalidatePins(profileId);
    }

    if (id) {
      await supabase
        .from("availability_sessions")
        .update({ status: "ended", ended_at: now })
        .eq("id", id);
    }

    // If still pending (never synced), record as no_connection for history
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
    applyStatus("idle");
  }, []);

  // ── Regenerate PIN (manual) ────────────────────────────────────────────────
  const regeneratePin = useCallback(async () => {
    const profileId = profileIdRef.current;
    if (!profileId) return;
    const cur = statusRef.current;
    if (cur !== "active" && cur !== "pending") return;

    // Invalidate current PIN
    if (pinIdRef.current) {
      await invalidatePins(profileId, pinIdRef.current);
    }
    pinIdRef.current = null;

    if (cur === "active") {
      await insertNewPin(profileId, sessionIdRef.current);
    } else {
      // Offline / pending — just generate locally
      const pin = generatePin();
      setSessionPin(pin);
    }
  }, []);

  const isAvailable = status === "active";

  return (
    <AvailabilityContext.Provider
      value={{ status, isAvailable, sessionPin, sessionId, startSession, endSession, regeneratePin }}
    >
      {children}
    </AvailabilityContext.Provider>
  );
}

export function useAvailability() {
  return useContext(AvailabilityContext);
}
