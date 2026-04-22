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
import { locationApi, type LocationMode } from "@/lib/locationApi";

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
    lng?: number,
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

const GPS_WATCH_INTERVAL_MS = 3000;
const GPS_WATCH_DISTANCE_M = 10;
const DB_WRITE_INTERVAL_MS = 30 * 1000;
const DB_WRITE_DISTANCE_M = 50;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

  const lastDbWriteTimeRef = useRef<number>(0);
  const lastDbWriteLatRef = useRef<number | null>(null);
  const lastDbWriteLngRef = useRef<number | null>(null);

  const watchSubRef = useRef<ExpoLocation.LocationSubscription | null>(null);

  const loadLocation = useCallback(async () => {
    try {
      const dto = await locationApi.get();
      const loc: ServiceLocation = {
        mode: dto.mode,
        serviceRadiusMeters: dto.serviceRadiusMeters,
        fixedAddress: dto.fixedAddress,
        fixedLat: dto.fixedLat,
        fixedLng: dto.fixedLng,
        realtimeLat: dto.realtimeLat,
        realtimeLng: dto.realtimeLng,
        realtimeUpdatedAt: dto.realtimeUpdatedAt
          ? new Date(dto.realtimeUpdatedAt)
          : null,
      };
      modeRef.current = loc.mode;
      setLocation(loc);
    } catch (e) {
      console.warn("[Location] loadLocation error:", e);
    }
  }, []);

  const writeToServer = useCallback(
    async (lat: number, lng: number, force = false) => {
      if (!profileIdRef.current) return;
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
      try {
        await locationApi.pushRealtime(lat, lng);
        lastDbWriteTimeRef.current = now;
        lastDbWriteLatRef.current = lat;
        lastDbWriteLngRef.current = lng;
      } catch {
        // silent — will retry on next tick
      }
    },
    [],
  );

  const startWatch = useCallback(async () => {
    if (watchSubRef.current) return;
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
        setLocation((prev) => ({
          ...prev,
          realtimeLat: lat,
          realtimeLng: lng,
          realtimeUpdatedAt: new Date(),
        }));
        writeToServer(lat, lng);
      },
    );
    watchSubRef.current = sub;
  }, [writeToServer]);

  const stopWatch = useCallback(() => {
    if (watchSubRef.current) {
      watchSubRef.current.remove();
      watchSubRef.current = null;
    }
  }, []);

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
      setLocation((prev) => ({
        ...prev,
        realtimeLat: lat,
        realtimeLng: lng,
        realtimeUpdatedAt: new Date(),
      }));
      await writeToServer(lat, lng, true);
    } catch {
      // GPS unavailable — silent
    }
  }, [writeToServer]);

  useEffect(() => {
    ExpoLocation.getForegroundPermissionsAsync().then(({ status }) => {
      setHasGpsPermission(status === "granted");
    });

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      profileIdRef.current = user.id;
      await loadLocation();
      setIsLoading(false);
      if (modeRef.current === "realtime") {
        await refreshGps();
        startWatch();
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          profileIdRef.current = session.user.id;
          loadLocation();
        } else {
          profileIdRef.current = null;
          stopWatch();
          setLocation(DEFAULT_LOCATION);
        }
      },
    );

    return () => {
      subscription.unsubscribe();
      stopWatch();
    };
  }, [loadLocation, refreshGps, startWatch, stopWatch]);

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
      lng?: number,
    ) => {
      if (!profileIdRef.current) return;
      const dto = await locationApi.save({
        mode,
        address,
        radiusMeters,
        lat: lat ?? null,
        lng: lng ?? null,
      });
      modeRef.current = dto.mode;
      setLocation((prev) => ({
        ...prev,
        mode: dto.mode,
        serviceRadiusMeters: dto.serviceRadiusMeters,
        fixedAddress: dto.fixedAddress,
        fixedLat: dto.fixedLat,
        fixedLng: dto.fixedLng,
      }));
    },
    [],
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
