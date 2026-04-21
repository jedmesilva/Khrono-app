import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = { status: "ok" } as const;
  res.json(data);
});

export default router;
