import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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

// GPS watch: fires every 3s or 10 meters of movement (whichever comes first)
const GPS_WATCH_INTERVAL_MS = 3000;
const GPS_WATCH_DISTANCE_M = 10;

// DB write throttle: write only when 30s passed OR user moved 50m+
const DB_WRITE_INTERVAL_MS = 30 * 1000;
const DB_WRITE_DISTANCE_M = 50;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<ServiceLocation>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGpsPermission, setHasGpsPermission] = useState(false);

  const profileIdRef = useRef<string | null>(null);
  const modeRef = useRef<LocationMode>("realtime");

  // DB write throttle state
  const lastDbWriteTimeRef = useRef<number>(0);
  const lastDbWriteLatRef = useRef<number | null>(null);
  const lastDbWriteLngRef = useRef<number | null>(null);

  // Active watch subscription
  const watchSubRef = useRef<ExpoLocation.LocationSubscription | null>(null);

  const loadLocation = useCallback(async (profileId: string) => {
    const { data, error } = await supabase
      .from("provider_locations")
      .select("*")
      .eq("profile_id", profileId)
      .single();

    if (!error && data) {
      const loc = rowToLocation(data);
      modeRef.current = loc.mode;
      setLocation(loc);
    }
  }, []);

  // Write position to DB respecting the throttle
  const writeToDb = useCallback(
    async (lat: number, lng: number, force = false) => {
      const profileId = profileIdRef.current;
      if (!profileId) return;

      const now = Date.now();
      const lastLat = lastDbWriteLatRef.current;
      const lastLng = lastDbWriteLngRef.current;

      const timeSinceLast = now - lastDbWriteTimeRef.current;
      const distMoved =
        lastLat != null && lastLng != null
          ? haversineMeters(lastLat, lastLng, lat, lng)
          : Infinity;

      const shouldWrite =
        force ||
        timeSinceLast >= DB_WRITE_INTERVAL_MS ||
        distMoved >= DB_WRITE_DISTANCE_M;

      if (!shouldWrite) return;

      const updatedAt = new Date().toISOString();
      const { error } = await supabase
        .from("provider_locations")
        .upsert(
          {
            profile_id: profileId,
            realtime_lat: lat,
            realtime_lng: lng,
            realtime_updated_at: updatedAt,
          },
          { onConflict: "profile_id" }
        );

      if (!error) {
        lastDbWriteTimeRef.current = now;
        lastDbWriteLatRef.current = lat;
        lastDbWriteLngRef.current = lng;
      }
    },
    []
  );

  // Start continuous GPS watch
  const startWatch = useCallback(async () => {
    if (watchSubRef.current) return; // already watching

    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setHasGpsPermission(false);
      return;
    }
    setHasGpsPermission(true);

    const sub = await ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: GPS_WATCH_INTERVAL_MS,
        distanceInterval: GPS_WATCH_DISTANCE_M,
      },
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const updatedAt = new Date();

        // Update local state immediately (every GPS tick)
        setLocation((prev) => ({
          ...prev,
          realtimeLat: lat,
          realtimeLng: lng,
          realtimeUpdatedAt: updatedAt,
        }));

        // Write to DB only when throttle allows
        writeToDb(lat, lng);
      }
    );

    watchSubRef.current = sub;
  }, [writeToDb]);

  // Stop continuous GPS watch
  const stopWatch = useCallback(() => {
    if (watchSubRef.current) {
      watchSubRef.current.remove();
      watchSubRef.current = null;
    }
  }, []);

  // One-shot GPS fetch (used for immediate initial position)
  const refreshGps = useCallback(async () => {
    if (!profileIdRef.current) return;
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
      const updatedAt = new Date();

      setLocation((prev) => ({
        ...prev,
        realtimeLat: lat,
        realtimeLng: lng,
        realtimeUpdatedAt: updatedAt,
      }));

      // Force DB write for the initial snapshot
      await writeToDb(lat, lng, true);
    } catch {
      // GPS unavailable — silent
    }
  }, [writeToDb]);

  // Init: load from DB, check permissions, start watch if realtime mode
  useEffect(() => {
    ExpoLocation.getForegroundPermissionsAsync().then(({ status }) => {
      setHasGpsPermission(status === "granted");
    });

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

      // If mode is realtime, start watch and get immediate snapshot
      if (modeRef.current === "realtime") {
        await refreshGps();
        startWatch();
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        profileIdRef.current = session.user.id;
        loadLocation(session.user.id);
      } else {
        profileIdRef.current = null;
        stopWatch();
        setLocation(DEFAULT_LOCATION);
      }
    });

    return () => {
      subscription.unsubscribe();
      stopWatch();
    };
  }, [loadLocation, refreshGps, startWatch, stopWatch]);

  // React to mode changes: start/stop watch accordingly
  useEffect(() => {
    if (location.mode === "realtime") {
      refreshGps().then(() => startWatch());
    } else {
      stopWatch();
    }
  }, [location.mode, refreshGps, startWatch, stopWatch]);

  const saveLocation = useCallback(
    async (
      mode: LocationMode,
      address: string,
      radiusMeters: number,
      lat?: number,
      lng?: number
    ) => {
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
        modeRef.current = mode;
        setLocation((prev) => ({
          ...prev,
          mode,
          serviceRadiusMeters: radiusMeters,
          fixedAddress: mode === "fixed" ? address : prev.fixedAddress,
          fixedLat: mode === "fixed" && lat != null ? lat : prev.fixedLat,
          fixedLng: mode === "fixed" && lng != null ? lng : prev.fixedLng,
        }));
      }
    },
    []
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
