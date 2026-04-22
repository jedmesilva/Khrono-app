import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import {
  isContractNotification,
  isScheduleNotification,
  sendExpoPush,
  type ExpoPushMessage,
} from "../lib/expoPush";

const router: IRouter = Router();

type AuthedReq = Request & { userId?: string };

router.get("/notifications", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return;
  }

  const limitParam = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

router.post(
  "/notifications/:id/read",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Missing authenticated user." });
      return;
    }
    const id = String(req.params.id ?? "").trim();
    if (!id) {
      res.status(400).json({ error: "id is required." });
      return;
    }

    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id)
      .eq("profile_id", userId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true, read_at: now });
  }
);

router.post(
  "/notifications/read-all",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Missing authenticated user." });
      return;
    }

    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("profile_id", userId)
      .is("read_at", null);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true, read_at: now });
  }
);

router.post(
  "/notifications/send",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const senderId = req.userId;
    if (!senderId) {
      res.status(401).json({ error: "Missing authenticated user." });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const recipientId = typeof body.recipientId === "string" ? body.recipientId : "";
    const title = typeof body.title === "string" ? body.title : "";
    const text = typeof body.body === "string" ? body.body : "";
    const type = typeof body.type === "string" ? body.type : "general";
    const data = (body.data && typeof body.data === "object") ? body.data : {};

    if (!recipientId || !title || !text) {
      res.status(400).json({ error: "recipientId, title and body are required." });
      return;
    }

    const supabase = getSupabaseAdmin();

    const { error: insertErr } = await supabase
      .from("notifications")
      .insert({ profile_id: recipientId, type, title, body: text, data });

    if (insertErr) {
      res.status(500).json({ error: insertErr.message });
      return;
    }

    const { data: tokens, error: tokensErr } = await supabase
      .from("push_tokens")
      .select(
        "token, notification_push_enabled, notification_contracts_enabled, notification_schedule_enabled"
      )
      .eq("profile_id", recipientId);

    if (tokensErr || !tokens) {
      res.json({ ok: true, pushed: 0 });
      return;
    }

    const validTokens = tokens
      .filter((row: any) => {
        if (row.notification_push_enabled === false) return false;
        if (
          isContractNotification(type) &&
          row.notification_contracts_enabled === false
        ) {
          return false;
        }
        if (
          isScheduleNotification(type) &&
          row.notification_schedule_enabled === false
        ) {
          return false;
        }
        return true;
      })
      .map((r: any) => r.token as string)
      .filter((t: string) => typeof t === "string" && t.startsWith("ExponentPushToken"));

    if (validTokens.length > 0) {
      const messages: ExpoPushMessage[] = validTokens.map((token) => ({
        to: token,
        title,
        body: text,
        data: data as Record<string, unknown>,
        sound: "default",
        priority: "high",
        badge: 1,
      }));
      await sendExpoPush(messages);
    }

    res.json({ ok: true, pushed: validTokens.length });
  }
);

export default router;
