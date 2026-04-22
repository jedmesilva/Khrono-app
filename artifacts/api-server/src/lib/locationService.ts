import { getSupabaseAdmin } from "./supabaseAdmin";

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

const DEFAULT: ServiceLocationDTO = {
  mode: "realtime",
  serviceRadiusMeters: 5000,
  fixedAddress: "",
  fixedLat: null,
  fixedLng: null,
  realtimeLat: null,
  realtimeLng: null,
  realtimeUpdatedAt: null,
};

function mapRow(row: any): ServiceLocationDTO {
  return {
    mode: row.location_mode === "fixed" ? "fixed" : "realtime",
    serviceRadiusMeters: row.service_radius_meters ?? 5000,
    fixedAddress: row.fixed_address ?? "",
    fixedLat: row.fixed_lat != null ? Number(row.fixed_lat) : null,
    fixedLng: row.fixed_lng != null ? Number(row.fixed_lng) : null,
    realtimeLat: row.realtime_lat != null ? Number(row.realtime_lat) : null,
    realtimeLng: row.realtime_lng != null ? Number(row.realtime_lng) : null,
    realtimeUpdatedAt: row.realtime_updated_at ?? null,
  };
}

export async function getLocation(profileId: string): Promise<ServiceLocationDTO> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("provider_locations")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data) : DEFAULT;
}

export async function saveLocation(
  profileId: string,
  input: {
    mode: LocationMode;
    address: string;
    radiusMeters: number;
    lat?: number | null;
    lng?: number | null;
  },
): Promise<ServiceLocationDTO> {
  const supabase = getSupabaseAdmin();
  const payload: Record<string, unknown> = {
    profile_id: profileId,
    location_mode: input.mode,
    service_radius_meters: input.radiusMeters,
  };
  if (input.mode === "fixed") {
    payload.fixed_address = input.address;
    if (input.lat != null) payload.fixed_lat = input.lat;
    if (input.lng != null) payload.fixed_lng = input.lng;
  }
  const { data, error } = await supabase
    .from("provider_locations")
    .upsert(payload, { onConflict: "profile_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updateRealtimeLocation(
  profileId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("provider_locations").upsert(
    {
      profile_id: profileId,
      realtime_lat: lat,
      realtime_lng: lng,
      realtime_updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );
}
