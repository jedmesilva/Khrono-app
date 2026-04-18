import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import * as ExpoLocation from "expo-location";
import { supabase } from "@/lib/supabase";
import type { LocationMode } from "@/constants/profile-data";

export type { LocationMode };

export type ServiceLocation = {
  mode: LocationMode;
  serviceRadiusMeters: number;
  fixedAddress: string;
  fixedLat: number | null;
  fixedLng: number | null;
  realtimeLat: number | null;
  realtimeLng: number | null;
  realtimeUpdatedAt: Date | null;
};

type LocationContextType = {
  location: ServiceLocation;
  isLoading: boolean;
  hasGpsPermission: boolean;
  saveLocation: (
    mode: LocationMode,
    address: string,
    radiusMeters: number,
    lat?: number,
    lng?: number
  ) => Promise<void>;
  refreshGps: () => Promise<void>;
};

const DEFAULT_LOCATION: ServiceLocation = {
  mode: "realtime",
  serviceRadiusMeters: 5000,
  fixedAddress: "",
  fixedLat: null,
  fixedLng: null,
  realtimeLat: null,
  realtimeLng: null,
  realtimeUpdatedAt: null,
};

const LocationContext = createContext<LocationContextType | null>(null);

function rowToLocation(row: any): ServiceLocation {
  return {
    mode: row.location_mode === "fixed" ? "fixed" : "realtime",
    serviceRadiusMeters: row.service_radius_meters ?? 5000,
    fixedAddress: row.fixed_address ?? "",
    fixedLat: row.fixed_lat != null ? Number(row.fixed_lat) : null,
    fixedLng: row.fixed_lng != null ? Number(row.fixed_lng) : null,
    realtimeLat: row.realtime_lat != null ? Number(row.realtime_lat) : null,
    realtimeLng: row.realtime_lng != null ? Number(row.realtime_lng) : null,
    realtimeUpdatedAt: row.realtime_updated_at
      ? new Date(row.realtime_updated_at)
      : null,
  };
}

const GPS_THROTTLE_MS = 5 * 60 * 1000;
const GPS_POLL_INTERVAL_MS = 5 * 60 * 1000;

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<ServiceLocation>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGpsPermission, setHasGpsPermission] = useState(false);
  const profileIdRef = useRef<string | null>(null);
  const lastGpsUpdateRef = useRef<number>(0);

  const loadLocation = useCallback(async (profileId: string) => {
    const { data, error } = await supabase
      .from("provider_locations")
      .select("*")
      .eq("profile_id", profileId)
      .single();

    if (!error && data) {
      setLocation(rowToLocation(data));
    }
  }, []);

  const refreshGps = useCallback(async () => {
    if (!profileIdRef.current) return;

    const now = Date.now();
    if (now - lastGpsUpdateRef.current < GPS_THROTTLE_MS) return;

    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasGpsPermission(false);
        return;
      }
      setHasGpsPermission(true);

      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const updatedAt = new Date().toISOString();

      await supabase.from("provider_locations").upsert(
        {
          profile_id: profileIdRef.current,
          realtime_lat: lat,
          realtime_lng: lng,
          realtime_updated_at: updatedAt,
        },
        { onConflict: "profile_id" }
      );

      setLocation((prev) => ({
        ...prev,
        realtimeLat: lat,
        realtimeLng: lng,
        realtimeUpdatedAt: new Date(updatedAt),
      }));

      lastGpsUpdateRef.current = now;
    } catch {
    }
  }, []);

  useEffect(() => {
    ExpoLocation.getForegroundPermissionsAsync().then(({ status }) => {
      setHasGpsPermission(status === "granted");
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      profileIdRef.current = user.id;
      await loadLocation(user.id);
      setIsLoading(false);

      const cur = await supabase
        .from("provider_locations")
        .select("location_mode")
        .eq("profile_id", user.id)
        .single();

      if (!cur.data || cur.data.location_mode === "realtime") {
        refreshGps();
      }
    };

    init();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          profileIdRef.current = session.user.id;
          loadLocation(session.user.id);
        } else {
          profileIdRef.current = null;
          setLocation(DEFAULT_LOCATION);
        }
      });

    return () => subscription.unsubscribe();
  }, [loadLocation, refreshGps]);

  useEffect(() => {
    if (location.mode !== "realtime") return;

    const poll = setInterval(() => {
      if (AppState.currentState === "active") {
        refreshGps();
      }
    }, GPS_POLL_INTERVAL_MS);

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && location.mode === "realtime") {
        refreshGps();
      }
    };
    const appStateSub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      clearInterval(poll);
      appStateSub.remove();
    };
  }, [location.mode, refreshGps]);

  const saveLocation = useCallback(
    async (mode: LocationMode, address: string, radiusMeters: number, lat?: number, lng?: number) => {
      if (!profileIdRef.current) return;

      const payload: Record<string, any> = {
        profile_id: profileIdRef.current,
        location_mode: mode,
        service_radius_meters: radiusMeters,
      };

      if (mode === "fixed") {
        payload.fixed_address = address;
        if (lat != null) payload.fixed_lat = lat;
        if (lng != null) payload.fixed_lng = lng;
      }

      const { error } = await supabase
        .from("provider_locations")
        .upsert(payload, { onConflict: "profile_id" });

      if (!error) {
        setLocation((prev) => ({
          ...prev,
          mode,
          serviceRadiusMeters: radiusMeters,
          fixedAddress: mode === "fixed" ? address : prev.fixedAddress,
          fixedLat: mode === "fixed" && lat != null ? lat : prev.fixedLat,
          fixedLng: mode === "fixed" && lng != null ? lng : prev.fixedLng,
        }));

        if (mode === "realtime") {
          refreshGps();
        }
      }
    },
    [refreshGps]
  );

  return (
    <LocationContext.Provider
      value={{ location, isLoading, hasGpsPermission, saveLocation, refreshGps }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}
