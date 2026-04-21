import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { settleContractEnd } from "../lib/contractsAccounting";

const router: IRouter = Router();

/**
 * POST /api/contracts/:id/end
 *
 * Server-side accounting for contract termination. Replaces the legacy
 * client-side calculation in ContractsContext.confirmEndContract.
 *
 * Body: { reason?: string }
 * Returns the full settlement breakdown (real amount, total paid, delta,
 * pending extra/refund, payment status) so the mobile UI can show toasts
 * without hitting the DB again.
 */
router.post("/contracts/:id/end", requireAuth, async (req, res) => {
  const contractId = String(req.params.id ?? "").trim();
  const actorId = (req as { userId?: string }).userId;
  const reason =
    typeof (req.body as { reason?: unknown })?.reason === "string"
      ? ((req.body as { reason: string }).reason)
      : undefined;

  if (!contractId) {
    res.status(400).json({ error: "contractId is required." });
    return;
  }
  if (!actorId) {
    res.status(401).json({ error: "Missing authenticated user." });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: party, error: partyError } = await supabase
      .from("contracts")
      .select("contractor_id, hired_id")
      .eq("id", contractId)
      .single();

    if (partyError || !party) {
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

    res.status(200).json(result);
  } catch (error) {
    req.log?.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to settle contract end."
    );
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to settle contract.",
    });
  }
});

export default router;
