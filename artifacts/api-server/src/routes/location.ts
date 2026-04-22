import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getLocation,
  saveLocation,
  updateRealtimeLocation,
  type LocationMode,
} from "../lib/locationService";

const router: IRouter = Router();
type AuthedReq = Request & { userId?: string };

function uid(req: AuthedReq, res: Response): string | null {
  if (!req.userId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return null;
  }
  return req.userId;
}

router.get("/location", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  try {
    res.json(await getLocation(userId));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.put("/location", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const mode = body.mode === "fixed" ? "fixed" : "realtime";
  const address = typeof body.address === "string" ? body.address : "";
  const radiusMeters = Number(body.radiusMeters ?? 5000);
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;
  try {
    res.json(
      await saveLocation(userId, {
        mode: mode as LocationMode,
        address,
        radiusMeters,
        lat,
        lng,
      }),
    );
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post(
  "/location/realtime",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: "lat and lng are required." });
      return;
    }
    try {
      await updateRealtimeLocation(userId, lat, lng);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

export default router;
