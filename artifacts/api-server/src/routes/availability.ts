import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  endSession,
  getProfileReadiness,
  markPinUsed,
  regeneratePin,
  setSessionStatus,
  startSession,
} from "../lib/availabilityService";

const router: IRouter = Router();
type AuthedReq = Request & { userId?: string };

function uid(req: AuthedReq, res: Response): string | null {
  if (!req.userId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return null;
  }
  return req.userId;
}

router.post(
  "/availability/sessions/start",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    try {
      const result = await startSession(userId, {
        lat: typeof body.lat === "number" ? body.lat : null,
        lng: typeof body.lng === "number" ? body.lng : null,
        locationAccuracy:
          typeof body.locationAccuracy === "number" ? body.locationAccuracy : null,
        metadata: (body.metadata as Record<string, unknown>) ?? {},
      });
      res.status(201).json(result);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

router.post(
  "/availability/sessions/:id/end",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    try {
      await endSession(userId, req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

router.post(
  "/availability/sessions/:id/pause",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    try {
      await setSessionStatus(userId, req.params.id, "paused");
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

router.post(
  "/availability/sessions/:id/resume",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    try {
      await setSessionStatus(userId, req.params.id, "active");
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

router.post(
  "/availability/sessions/:id/regenerate-pin",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const currentPinId = typeof body.currentPinId === "string" ? body.currentPinId : null;
    try {
      const pin = await regeneratePin(userId, req.params.id, currentPinId);
      res.status(201).json(pin);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

router.post(
  "/availability/pins/used",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const targetProfileId =
      typeof body.profileId === "string" ? body.profileId : userId;
    const pin = typeof body.pin === "string" ? body.pin : "";
    if (!pin) {
      res.status(400).json({ error: "pin is required." });
      return;
    }
    try {
      await markPinUsed(targetProfileId, pin);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

router.get(
  "/availability/profile-readiness",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    try {
      res.json(await getProfileReadiness(userId));
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

export default router;
