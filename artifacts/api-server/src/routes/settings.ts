import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

const router: IRouter = Router();

type AuthedReq = Request & { userId?: string };

const DEFAULTS = {
  notification_push_enabled: true,
  notification_contracts_enabled: true,
  notification_schedule_enabled: false,
  haptics_enabled: true,
  two_factor_enabled: false,
  biometric_auth_enabled: false,
  facial_recognition_enabled: false,
  theme_preference: "light" as const,
};

const ALLOWED_KEYS = new Set<keyof typeof DEFAULTS>([
  "notification_push_enabled",
  "notification_contracts_enabled",
  "notification_schedule_enabled",
  "haptics_enabled",
  "two_factor_enabled",
  "biometric_auth_enabled",
  "facial_recognition_enabled",
  "theme_preference",
]);

function mapRow(row: any) {
  return {
    notification_push_enabled: Boolean(row?.notification_push_enabled ?? true),
    notification_contracts_enabled: Boolean(row?.notification_contracts_enabled ?? true),
    notification_schedule_enabled: Boolean(row?.notification_schedule_enabled ?? false),
    haptics_enabled: Boolean(row?.haptics_enabled ?? true),
    two_factor_enabled: Boolean(row?.two_factor_enabled ?? false),
    biometric_auth_enabled: Boolean(row?.biometric_auth_enabled ?? false),
    facial_recognition_enabled: Boolean(row?.facial_recognition_enabled ?? false),
    theme_preference: ["light", "dark", "system"].includes(row?.theme_preference)
      ? row.theme_preference
      : "light",
  };
}

router.get("/api/settings", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (data) {
    res.json(mapRow(data));
    return;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("user_settings")
    .insert({ profile_id: userId, ...DEFAULTS })
    .select("*")
    .single();

  if (insertErr) {
    res.status(500).json({ error: insertErr.message });
    return;
  }

  res.json(mapRow(inserted));
});

router.patch("/api/settings", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = { profile_id: userId };

  for (const k of Object.keys(body)) {
    if (ALLOWED_KEYS.has(k as any)) update[k] = body[k];
  }

  if (Object.keys(update).length === 1) {
    res.status(400).json({ error: "No valid fields to update." });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(update, { onConflict: "profile_id" })
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(mapRow(data));
});

export default router;
