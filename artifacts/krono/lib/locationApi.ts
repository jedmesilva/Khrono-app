import { apiFetch } from "@/lib/apiClient";

export type LocationMode = "realtime" | "fixed";

export type ServiceLocationDTO = {
  mode: LocationMode;
  serviceRadiusMeters: number;
  fixedAddress: string;
  fixedLat: number | null;
  fixedLng: number | null;
  realtimeLat: number | null;
  realtimeLng: number | null;
  realtimeUpdatedAt: string | null;
};

export const locationApi = {
  get(): Promise<ServiceLocationDTO> {
    return apiFetch("/api/location");
  },
  save(input: {
    mode: LocationMode;
    address: string;
    radiusMeters: number;
    lat?: number | null;
    lng?: number | null;
  }): Promise<ServiceLocationDTO> {
    return apiFetch("/api/location", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  pushRealtime(lat: number, lng: number): Promise<{ ok: true }> {
    return apiFetch("/api/location/realtime", {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    });
  },
};
