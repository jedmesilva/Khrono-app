import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

const router: IRouter = Router();

type AuthedReq = Request & { userId?: string };

router.post("/push-tokens", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform : "unknown";

  if (!token) {
    res.status(400).json({ error: "token is required." });
    return;
  }

  const allowedPlatforms = new Set(["ios", "android", "web", "unknown"]);
  const safePlatform = allowedPlatforms.has(platform) ? platform : "unknown";

  const payload: Record<string, unknown> = {
    profile_id: userId,
    token,
    platform: safePlatform,
    updated_at: new Date().toISOString(),
  };

  if (typeof body.notification_push_enabled === "boolean") {
    payload.notification_push_enabled = body.notification_push_enabled;
  }
  if (typeof body.notification_contracts_enabled === "boolean") {
    payload.notification_contracts_enabled = body.notification_contracts_enabled;
  }
  if (typeof body.notification_schedule_enabled === "boolean") {
    payload.notification_schedule_enabled = body.notification_schedule_enabled;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("push_tokens")
    .upsert(payload, { onConflict: "profile_id,token" })
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

router.delete("/push-tokens", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("push_tokens").delete().eq("profile_id", userId);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ ok: true });
});

export default router;
