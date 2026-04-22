import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  addUserService,
  addUserSkill,
  createProviderService,
  createProviderTool,
  deleteProviderService,
  deleteProviderTool,
  getMyProfile,
  listProviderServices,
  listProviderTools,
  listUserServices,
  listUserSkills,
  patchMyProfile,
  removeUserService,
  removeUserSkill,
  setUserSkillActive,
  updateProviderService,
  updateProviderTool,
} from "../lib/profileService";

const router: IRouter = Router();
type AuthedReq = Request & { userId?: string };

function uid(req: AuthedReq, res: Response): string | null {
  if (!req.userId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return null;
  }
  return req.userId;
}

function handle(p: Promise<unknown>, res: Response, status = 200) {
  p.then((data) => res.status(status).json(data)).catch((e) =>
    res.status(400).json({ error: (e as Error).message }),
  );
}

// ─── Profile basics ──────────────────────────────────────────────────────────

router.get("/profile", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  handle(getMyProfile(userId), res);
});

router.patch("/profile", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  handle(patchMyProfile(userId, req.body ?? {}), res);
});

// ─── Provider services ───────────────────────────────────────────────────────

router.get(
  "/me/provider-services",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    handle(listProviderServices(userId), res);
  },
);

router.post(
  "/me/provider-services",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (typeof b.nome !== "string" || typeof b.hourlyRate !== "number") {
      res.status(400).json({ error: "nome e hourlyRate são obrigatórios." });
      return;
    }
    handle(
      createProviderService(userId, {
        nome: b.nome,
        description: typeof b.description === "string" ? b.description : null,
        hourlyRate: b.hourlyRate,
        isActive: typeof b.isActive === "boolean" ? b.isActive : true,
        skillIds: Array.isArray(b.skillIds) ? (b.skillIds as string[]) : [],
        toolIds: Array.isArray(b.toolIds) ? (b.toolIds as string[]) : [],
      }),
      res,
      201,
    );
  },
);

router.patch(
  "/me/provider-services/:id",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    const b = (req.body ?? {}) as Record<string, unknown>;
    handle(
      updateProviderService(userId, req.params.id, {
        nome: typeof b.nome === "string" ? b.nome : undefined,
        description: typeof b.description === "string" ? b.description : undefined,
        hourlyRate: typeof b.hourlyRate === "number" ? b.hourlyRate : undefined,
        isActive: typeof b.isActive === "boolean" ? b.isActive : undefined,
        skillIds: Array.isArray(b.skillIds) ? (b.skillIds as string[]) : undefined,
        toolIds: Array.isArray(b.toolIds) ? (b.toolIds as string[]) : undefined,
      }),
      res,
    );
  },
);

router.delete(
  "/me/provider-services/:id",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    handle(
      deleteProviderService(userId, req.params.id).then(() => ({ ok: true })),
      res,
    );
  },
);

// ─── Provider tools ──────────────────────────────────────────────────────────

router.get("/me/tools", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  handle(listProviderTools(userId), res);
});

router.post("/me/tools", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (typeof b.nome !== "string" || typeof b.tipo !== "string") {
    res.status(400).json({ error: "nome e tipo são obrigatórios." });
    return;
  }
  handle(
    createProviderTool(userId, {
      nome: b.nome,
      tipo: b.tipo,
      details: typeof b.details === "string" ? b.details : "",
      brand: typeof b.brand === "string" ? b.brand : null,
      model: typeof b.model === "string" ? b.model : null,
      manufactureYear:
        typeof b.manufactureYear === "number" ? b.manufactureYear : null,
      isAvailable: typeof b.isAvailable === "boolean" ? b.isAvailable : true,
    }),
    res,
    201,
  );
});

router.patch(
  "/me/tools/:id",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    handle(
      updateProviderTool(userId, req.params.id, (req.body ?? {}) as any),
      res,
    );
  },
);

router.delete(
  "/me/tools/:id",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    handle(
      deleteProviderTool(userId, req.params.id).then(() => ({ ok: true })),
      res,
    );
  },
);

// ─── User skills (catalog picks) ─────────────────────────────────────────────

router.get("/me/skills", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  handle(listUserSkills(userId), res);
});

router.post("/me/skills", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const skillId = typeof b.skillId === "string" ? b.skillId : "";
  if (!skillId) {
    res.status(400).json({ error: "skillId é obrigatório." });
    return;
  }
  handle(addUserSkill(userId, skillId), res, 201);
});

router.patch(
  "/me/skills/:id",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (typeof b.isActive !== "boolean") {
      res.status(400).json({ error: "isActive (boolean) é obrigatório." });
      return;
    }
    handle(
      setUserSkillActive(userId, req.params.id, b.isActive).then(() => ({ ok: true })),
      res,
    );
  },
);

router.delete(
  "/me/skills/:skillId",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    handle(
      removeUserSkill(userId, req.params.skillId).then(() => ({ ok: true })),
      res,
    );
  },
);

// ─── User services (catalog picks) ───────────────────────────────────────────

router.get("/me/user-services", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  handle(listUserServices(userId), res);
});

router.post("/me/user-services", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = uid(req, res);
  if (!userId) return;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const serviceId = typeof b.serviceId === "string" ? b.serviceId : "";
  if (!serviceId) {
    res.status(400).json({ error: "serviceId é obrigatório." });
    return;
  }
  handle(addUserService(userId, serviceId), res, 201);
});

router.delete(
  "/me/user-services/:serviceId",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = uid(req, res);
    if (!userId) return;
    handle(
      removeUserService(userId, req.params.serviceId).then(() => ({ ok: true })),
      res,
    );
  },
);

export default router;
