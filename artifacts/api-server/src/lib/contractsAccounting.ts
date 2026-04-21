import type { SupabaseClient } from "@supabase/supabase-js";

const PAID_PAYMENT_STATUSES = new Set([
  "confirmed",
  "paid",
  "completed",
  "succeeded",
]);

export type SettlementResult = {
  contractId: string;
  endedAt: string;
  durationHours: number;
  fixedHours: number | null;
  realAmount: number;
  totalPaid: number;
  delta: number;
  paymentStatus: string;
  pendingExtraAmount: number | null;
  pendingRefundAmount: number | null;
};

function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}

/**
 * Settles a contract end:
 *   1. Computes the real amount based on elapsed time × hourly rate.
 *      - Defined contracts: proportional to elapsed (capped at fixed hours
 *        when ending early; overrun is also charged proportionally).
 *      - Open contracts: elapsed × rate.
 *   2. Sums all contract_payments rows with a settled status.
 *   3. delta = realAmount − totalPaid.
 *      - |delta| < 0.01 → fully paid.
 *      - delta < 0      → refund |delta| (auto for wallet, otherwise pending).
 *      - delta > 0      → pending extra charge (creates pending_retry payment row).
 *   4. Updates the contract row last so the status flip is the final step;
 *      if anything before fails, the contract stays in pending_end and can
 *      be retried safely.
 */
export async function settleContractEnd(params: {
  supabase: SupabaseClient;
  contractId: string;
  actorId: string;
  reason?: string;
}): Promise<SettlementResult> {
  const { supabase, contractId, actorId, reason } = params;

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(
      "id, type, billing_trigger, payment_method, hourly_rate, total_hours, started_at, contractor_id, hired_id, status"
    )
    .eq("id", contractId)
    .single();

  if (contractError || !contract) {
    throw new Error(contractError?.message ?? "Contrato não encontrado");
  }

  if (contract.status === "ended") {
    throw new Error("Contrato já está encerrado");
  }
  if (!contract.started_at) {
    throw new Error("Contrato ainda não foi iniciado");
  }

  const startedAtMs = new Date(contract.started_at as string).getTime();
  const endedAtMs = Date.now();
  if (endedAtMs <= startedAtMs) {
    throw new Error("Data de encerramento inválida");
  }

  const durationHours = (endedAtMs - startedAtMs) / 1000 / 3600;
  const fixedHours =
    contract.total_hours != null ? Number(contract.total_hours) : null;
  const hourlyRate = Number(contract.hourly_rate);

  const realHours = durationHours; // proportional both for early end and overrun
  const realAmount = round2(realHours * hourlyRate);

  const { data: payments, error: paymentsError } = await supabase
    .from("contract_payments")
    .select("id, amount, status, method, payer_id, payee_id")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });

  if (paymentsError) throw new Error(paymentsError.message);

  const totalPaid = round2(
    (payments ?? [])
      .filter((p) => PAID_PAYMENT_STATUSES.has(String(p.status)))
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
  );

  const delta = round2(realAmount - totalPaid);

  const payerId =
    (contract.contractor_id as string | null) ?? null;
  const payeeId = (contract.hired_id as string | null) ?? null;
  const paymentMethodDb = contract.payment_method as string | null;

  let paymentStatus: string;
  let pendingExtraAmount: number | null = null;
  let pendingRefundAmount: number | null = null;

  if (Math.abs(delta) < 0.01) {
    paymentStatus = "paid";
  } else if (delta < 0) {
    const refundAmount = round2(Math.abs(delta));
    pendingRefundAmount = refundAmount;
    paymentStatus = "paid";

    if (paymentMethodDb === "balance" && payerId) {
      // Auto-refund to wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("profile_id", payerId)
        .maybeSingle();

      if (wallet) {
        const prev = Number(wallet.balance);
        const newBalance = round2(prev + refundAmount);
        await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("id", wallet.id);

        const { data: walletTx } = await supabase
          .from("wallet_transactions")
          .insert({
            wallet_id: wallet.id,
            profile_id: payerId,
            type: "refund",
            status: "completed",
            amount: refundAmount,
            balance_before: prev,
            balance_after: newBalance,
            description: `Reembolso encerramento – contrato #${contractId.slice(0, 8)}`,
            contract_id: contractId,
          })
          .select("id")
          .single();

        await supabase.from("contract_refunds").insert({
          contract_id: contractId,
          payment_id: payments?.[0]?.id ?? null,
          profile_id: payerId,
          amount: refundAmount,
          reason: "early_end",
          status: "processed",
          wallet_tx_id: walletTx?.id ?? null,
          processed_at: new Date().toISOString(),
        });
      } else {
        await supabase.from("contract_refunds").insert({
          contract_id: contractId,
          payment_id: payments?.[0]?.id ?? null,
          profile_id: payerId,
          amount: refundAmount,
          reason: "early_end",
          status: "pending",
        });
      }
    } else {
      await supabase.from("contract_refunds").insert({
        contract_id: contractId,
        payment_id: payments?.[0]?.id ?? null,
        profile_id: payerId ?? actorId,
        amount: refundAmount,
        reason: "early_end",
        status: "pending",
      });
    }
  } else {
    pendingExtraAmount = round2(delta);
    paymentStatus = "awaiting_confirmation";

    if (payerId && payeeId && paymentMethodDb) {
      await supabase.from("contract_payments").insert({
        contract_id: contractId,
        payer_id: payerId,
        payee_id: payeeId,
        method:
          paymentMethodDb === "balance" ? "wallet_balance" : paymentMethodDb,
        amount: pendingExtraAmount,
        status: "pending_retry",
        requested_by: actorId,
      });
    }
  }

  const endedAtIso = new Date(endedAtMs).toISOString();

  const { error: updateError } = await supabase
    .from("contracts")
    .update({
      status: "ended",
      ended_at: endedAtIso,
      total_amount: realAmount,
      payment_status: paymentStatus,
      pending_extra_amount: pendingExtraAmount,
      pending_refund_amount: pendingRefundAmount,
    })
    .eq("id", contractId);

  if (updateError) throw new Error(updateError.message);

  await supabase
    .from("contract_action_requests")
    .update({
      status: "accepted",
      responded_by: actorId,
      response_reason: reason ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq("contract_id", contractId)
    .eq("type", "end")
    .eq("status", "pending");

  await supabase.from("contract_events").insert({
    contract_id: contractId,
    actor_id: actorId,
    actor_role: "platform",
    event_type: "ended",
    reason: reason ?? null,
    metadata: {
      total_amount: realAmount,
      total_paid: totalPaid,
      delta,
      payment_method: paymentMethodDb,
      billing_trigger: contract.billing_trigger,
      pending_extra: pendingExtraAmount,
      pending_refund: pendingRefundAmount,
      duration_hours: durationHours,
      fixed_hours: fixedHours,
      settled_by: "api-server",
    },
  });

  return {
    contractId,
    endedAt: endedAtIso,
    durationHours,
    fixedHours,
    realAmount,
    totalPaid,
    delta,
    paymentStatus,
    pendingExtraAmount,
    pendingRefundAmount,
  };
}
