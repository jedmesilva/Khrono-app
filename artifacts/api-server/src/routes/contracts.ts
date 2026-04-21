import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { settleContractEnd } from "../lib/contractsAccounting";
import {
  acceptContract,
  beginContract,
  cancelContract,
  changePaymentMethod,
  confirmCancelContract,
  confirmCashPayment,
  createDraftContract,
  deleteDraftContract,
  disputeCashPayment,
  finalizeContract,
  payPendingBalance,
  processDraftPayment,
  rejectCancelRequest,
  rejectContract,
  rejectEndRequest,
  reportCashPaid,
  reportCashReceived,
  requestCancelContract,
  requestEndContract,
  startContract,
  type AuditSnapshot,
} from "../lib/contractsService";

const router: IRouter = Router();

type AuthedReq = Request & { userId?: string };

function getActor(req: AuthedReq, res: Response): string | null {
  const id = req.userId;
  if (!id) {
    res.status(401).json({ error: "Missing authenticated user." });
    return null;
  }
  return id;
}

function getContractId(req: Request, res: Response): string | null {
  const id = String(req.params.id ?? "").trim();
  if (!id) {
    res.status(400).json({ error: "contractId is required." });
    return null;
  }
  return id;
}

function getAudit(req: Request): AuditSnapshot | undefined {
  const audit = (req.body as { audit?: AuditSnapshot })?.audit;
  return audit && typeof audit === "object" ? audit : undefined;
}

function handleError(res: Response, req: Request, err: unknown, label: string) {
  const message = err instanceof Error ? err.message : String(err);
  req.log?.error({ err: message }, label);
  res.status(500).json({ error: message });
}

// ── Settlement (pre-existente) ────────────────────────────────────────────
router.post("/contracts/:id/end", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  const reason =
    typeof (req.body as { reason?: unknown })?.reason === "string"
      ? (req.body as { reason: string }).reason
      : undefined;

  try {
    const supabase = getSupabaseAdmin();
    const { data: party } = await supabase
      .from("contracts")
      .select("contractor_id, hired_id")
      .eq("id", contractId)
      .single();
    if (!party) {
      res.status(404).json({ error: "Contrato não encontrado." });
      return;
    }
    if (party.contractor_id !== actorId && party.hired_id !== actorId) {
      res.status(403).json({ error: "Você não participa deste contrato." });
      return;
    }
    const result = await settleContractEnd({
      supabase,
      contractId,
      actorId,
      reason,
    });
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "settle-end failed");
  }
});

// ── Draft contract lifecycle ──────────────────────────────────────────────
router.post("/contracts/draft", requireAuth, async (req: AuthedReq, res) => {
  const actorId = getActor(req, res);
  if (!actorId) return;
  try {
    const result = await createDraftContract(getSupabaseAdmin(), actorId, req.body ?? {});
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "create-draft failed");
  }
});

router.post("/contracts/:id/payment", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  try {
    const result = await processDraftPayment(getSupabaseAdmin(), actorId, contractId, req.body ?? {});
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "process-payment failed");
  }
});

router.post("/contracts/:id/finalize", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  try {
    const result = await finalizeContract(getSupabaseAdmin(), actorId, contractId, getAudit(req));
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "finalize failed");
  }
});

router.delete("/contracts/:id", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  try {
    await deleteDraftContract(getSupabaseAdmin(), actorId, contractId);
    res.json({ ok: true });
  } catch (err) {
    handleError(res, req, err, "delete-draft failed");
  }
});

// ── Legacy "start now" (cria + ativa) ─────────────────────────────────────
router.post("/contracts/start-now", requireAuth, async (req: AuthedReq, res) => {
  const actorId = getActor(req, res);
  if (!actorId) return;
  try {
    const result = await startContract(
      getSupabaseAdmin(),
      actorId,
      req.body ?? {},
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "start-now failed");
  }
});

// ── Estado: aceitar/recusar/iniciar/cancelar ──────────────────────────────
function mountSimple(
  path: string,
  fn: (
    sb: ReturnType<typeof getSupabaseAdmin>,
    actorId: string,
    contractId: string,
    audit?: AuditSnapshot,
  ) => Promise<unknown>,
) {
  router.post(path, requireAuth, async (req: AuthedReq, res) => {
    const contractId = getContractId(req, res);
    if (!contractId) return;
    const actorId = getActor(req, res);
    if (!actorId) return;
    try {
      const result = await fn(getSupabaseAdmin(), actorId, contractId, getAudit(req));
      res.json(result ?? { ok: true });
    } catch (err) {
      handleError(res, req, err, `${path} failed`);
    }
  });
}

mountSimple("/contracts/:id/accept", acceptContract);
mountSimple("/contracts/:id/reject", rejectContract);
mountSimple("/contracts/:id/begin", beginContract);
mountSimple("/contracts/:id/cancel-now", cancelContract);
mountSimple("/contracts/:id/reject-end", rejectEndRequest);

// ── Pedidos com motivo ────────────────────────────────────────────────────
router.post("/contracts/:id/request-end", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  const reason = String((req.body as { reason?: string })?.reason ?? "").trim();
  if (!reason) {
    res.status(400).json({ error: "reason is required." });
    return;
  }
  try {
    const result = await requestEndContract(
      getSupabaseAdmin(),
      actorId,
      contractId,
      reason,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "request-end failed");
  }
});

router.post("/contracts/:id/request-cancel", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  const reason = String((req.body as { reason?: string })?.reason ?? "").trim();
  if (!reason) {
    res.status(400).json({ error: "reason is required." });
    return;
  }
  try {
    const result = await requestCancelContract(
      getSupabaseAdmin(),
      actorId,
      contractId,
      reason,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "request-cancel failed");
  }
});

router.post("/contracts/:id/confirm-cancel", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  const reason = String(
    (req.body as { reason?: string })?.reason ?? "Cancelado com acordo mútuo",
  );
  try {
    const result = await confirmCancelContract(
      getSupabaseAdmin(),
      actorId,
      contractId,
      reason,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "confirm-cancel failed");
  }
});

router.post("/contracts/:id/reject-cancel", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  const reason = (req.body as { reason?: string })?.reason;
  try {
    const result = await rejectCancelRequest(
      getSupabaseAdmin(),
      actorId,
      contractId,
      reason,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "reject-cancel failed");
  }
});

// ── Pagamentos em dinheiro ────────────────────────────────────────────────
router.post("/contracts/:id/cash-paid", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  const amountReported = Number((req.body as { amountReported?: number })?.amountReported);
  if (!Number.isFinite(amountReported)) {
    res.status(400).json({ error: "amountReported is required" });
    return;
  }
  try {
    const result = await reportCashPaid(
      getSupabaseAdmin(),
      actorId,
      contractId,
      amountReported,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "cash-paid failed");
  }
});

router.post("/contracts/:id/cash-received", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  const body = req.body as { amountReceived?: number; isIncomplete?: boolean };
  const amountReceived = Number(body?.amountReceived);
  const isIncomplete = !!body?.isIncomplete;
  if (!Number.isFinite(amountReceived)) {
    res.status(400).json({ error: "amountReceived is required" });
    return;
  }
  try {
    const result = await reportCashReceived(
      getSupabaseAdmin(),
      actorId,
      contractId,
      amountReceived,
      isIncomplete,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "cash-received failed");
  }
});

router.post("/contracts/:id/confirm-cash", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  try {
    const result = await confirmCashPayment(
      getSupabaseAdmin(),
      actorId,
      contractId,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "confirm-cash failed");
  }
});

router.post("/contracts/:id/dispute-cash", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  const reason = String(
    (req.body as { reason?: string })?.reason ?? "Pagamento em dinheiro contestado",
  );
  try {
    const result = await disputeCashPayment(
      getSupabaseAdmin(),
      actorId,
      contractId,
      reason,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "dispute-cash failed");
  }
});

router.post("/contracts/:id/payment-method", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  const body = req.body as { newMethod?: string; cardLabel?: string };
  if (!body?.newMethod) {
    res.status(400).json({ error: "newMethod is required" });
    return;
  }
  try {
    const result = await changePaymentMethod(
      getSupabaseAdmin(),
      actorId,
      contractId,
      body.newMethod,
      body.cardLabel,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "payment-method failed");
  }
});

router.post("/contracts/:id/pay-pending", requireAuth, async (req: AuthedReq, res) => {
  const contractId = getContractId(req, res);
  if (!contractId) return;
  const actorId = getActor(req, res);
  if (!actorId) return;
  try {
    const result = await payPendingBalance(
      getSupabaseAdmin(),
      actorId,
      contractId,
      getAudit(req),
    );
    res.json(result);
  } catch (err) {
    handleError(res, req, err, "pay-pending failed");
  }
});

export default router;
