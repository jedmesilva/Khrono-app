import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  addCard,
  getOrCreateWallet,
  listCards,
  listTransactions,
  recordDeposit,
  recordWithdrawal,
  removeCard,
  setDefaultCard,
  type CardBandeira,
} from "../lib/walletService";

const router: IRouter = Router();
type AuthedReq = Request & { userId?: string };

function assertUser(req: AuthedReq, res: Response): string | null {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return null;
  }
  return userId;
}

router.get("/wallet", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = assertUser(req, res);
  if (!userId) return;
  try {
    const wallet = await getOrCreateWallet(userId);
    res.json(wallet);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/wallet/cards", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = assertUser(req, res);
  if (!userId) return;
  try {
    res.json(await listCards(userId));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/wallet/cards", requireAuth, async (req: AuthedReq, res: Response) => {
  const userId = assertUser(req, res);
  if (!userId) return;
  const body = (req.body ?? {}) as Record<string, unknown>;

  const bandeira = body.bandeira as CardBandeira;
  const lastFour = typeof body.lastFour === "string" ? body.lastFour : "";
  const titular = typeof body.titular === "string" ? body.titular : "";
  const validade = typeof body.validade === "string" ? body.validade : "";
  const stripePaymentMethodId =
    typeof body.stripePaymentMethodId === "string" ? body.stripePaymentMethodId : null;

  if (!bandeira || !lastFour || !titular || !validade) {
    res.status(400).json({ error: "bandeira, lastFour, titular e validade são obrigatórios." });
    return;
  }

  try {
    const card = await addCard(userId, {
      bandeira,
      lastFour,
      titular,
      validade,
      stripePaymentMethodId,
    });
    res.status(201).json(card);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.delete(
  "/wallet/cards/:id",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = assertUser(req, res);
    if (!userId) return;
    try {
      await removeCard(userId, req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

router.post(
  "/wallet/cards/:id/default",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = assertUser(req, res);
    if (!userId) return;
    try {
      await setDefaultCard(userId, req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

router.get(
  "/wallet/transactions",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = assertUser(req, res);
    if (!userId) return;
    const limit = Number(req.query.limit ?? 100);
    try {
      res.json(await listTransactions(userId, Number.isFinite(limit) ? limit : 100));
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  },
);

router.post(
  "/wallet/deposits",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = assertUser(req, res);
    if (!userId) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const amount = Number(body.amount);
    const pixKey = typeof body.pixKey === "string" ? body.pixKey : null;
    const pixKeyType = typeof body.pixKeyType === "string" ? body.pixKeyType : null;
    try {
      const tx = await recordDeposit(userId, amount, pixKey, pixKeyType);
      res.status(201).json(tx);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  },
);

router.post(
  "/wallet/withdrawals",
  requireAuth,
  async (req: AuthedReq, res: Response) => {
    const userId = assertUser(req, res);
    if (!userId) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const amount = Number(body.amount);
    const pixKey = typeof body.pixKey === "string" ? body.pixKey : "";
    const pixKeyType = typeof body.pixKeyType === "string" ? body.pixKeyType : "";
    try {
      const tx = await recordWithdrawal(userId, amount, pixKey, pixKeyType);
      res.status(201).json(tx);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  },
);

export default router;
