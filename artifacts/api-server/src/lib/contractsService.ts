import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditSnapshot = {
  device_id?: string | null;
  device_platform?: string | null;
  app_version?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_meters?: number | null;
};

export type ActorRole = "contractor" | "hired" | "platform" | "admin" | "unknown";

function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}

function mapPaymentMethodDb(pm: string | null | undefined): string | null {
  if (!pm) return null;
  switch (pm) {
    case "cartao":
    case "card":
      return "card";
    case "pix":
      return "pix";
    case "saldo":
    case "balance":
      return "balance";
    case "dinheiro":
    case "cash":
      return "cash";
    default:
      return null;
  }
}

function methodForPayment(methodDb: string | null): string {
  if (methodDb === "balance") return "wallet_balance";
  return methodDb ?? "cash";
}

async function getActorRole(
  supabase: SupabaseClient,
  contractId: string,
  actorId: string,
): Promise<ActorRole> {
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  if (!data) return "unknown";
  if (data.contractor_id === actorId) return "contractor";
  if (data.hired_id === actorId) return "hired";
  return "unknown";
}

export async function recordEvent(
  supabase: SupabaseClient,
  params: {
    contractId: string;
    actorId: string;
    actorRole: ActorRole;
    eventType: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    audit?: AuditSnapshot;
  },
) {
  await supabase.from("contract_events").insert({
    contract_id: params.contractId,
    actor_id: params.actorId,
    actor_role: params.actorRole,
    event_type: params.eventType,
    reason: params.reason ?? null,
    metadata: params.metadata ?? {},
    ...(params.audit ?? {}),
  });
}

async function ensureParty(
  supabase: SupabaseClient,
  contractId: string,
  actorId: string,
): Promise<ActorRole> {
  const role = await getActorRole(supabase, contractId, actorId);
  if (role === "unknown") {
    throw new Error("Você não participa deste contrato.");
  }
  return role;
}

// ── createDraftContract ────────────────────────────────────────────────────
export type CreateDraftInput = {
  hiredProfileId: string;
  type: "timer" | "cronometro";
  ratePerHour: number;
  duracaoTotalMs?: number | null;
  serviceId?: string | null;
  paymentMethod?: string | null;
  paymentCardLabel?: string | null;
  agendado?: boolean;
  scheduledForMs?: number | null;
  location?: string | null;
  distanceKm?: number | null;
};

export async function createDraftContract(
  supabase: SupabaseClient,
  actorId: string,
  input: CreateDraftInput,
): Promise<{ id: string }> {
  const isDefinido = input.type === "timer";
  const scheduledFor = input.scheduledForMs ?? Date.now();

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      status: "draft",
      contractor_id: actorId,
      hired_id: input.hiredProfileId,
      type: isDefinido ? "defined" : "open",
      total_hours:
        isDefinido && input.duracaoTotalMs
          ? input.duracaoTotalMs / 3600000
          : null,
      service_id: input.serviceId ?? null,
      hourly_rate: input.ratePerHour ?? 0,
      payment_method: mapPaymentMethodDb(input.paymentMethod),
      payment_card_label: input.paymentCardLabel ?? null,
      payment_status: "pending",
      billing_trigger: isDefinido ? "on_start" : "on_end",
      agendado: input.agendado ?? false,
      scheduled_for: new Date(scheduledFor).toISOString(),
      location: input.location ?? null,
      distance_km: input.distanceKm ?? null,
    })
    .select("id")
    .single();

  if (error || !contract) {
    throw new Error(error?.message ?? "Falha ao criar rascunho");
  }

  await supabase.from("contract_parties").insert([
    { contract_id: contract.id, user_id: actorId, role: "contractor" },
    { contract_id: contract.id, user_id: input.hiredProfileId, role: "hired" },
  ]);

  return { id: contract.id as string };
}

export async function deleteDraftContract(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
): Promise<void> {
  await supabase
    .from("contracts")
    .delete()
    .eq("id", contractId)
    .eq("status", "draft")
    .eq("contractor_id", actorId);
}

// ── processDraftPayment ────────────────────────────────────────────────────
// Inserts contract_payments row with proper status. Also debits wallet for
// balance method. Returns nothing for cash/pix/card_open. For card+amount>0,
// the route layer is responsible for creating the Stripe PaymentIntent and
// passing back the clientSecret.
export type ProcessPaymentInput = {
  method: string;
  amount: number;
  stripePaymentIntentId?: string | null;
  pixPaymentIntentId?: string | null;
};

export async function processDraftPayment(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  input: ProcessPaymentInput,
): Promise<{ paymentId: string }> {
  const { data: row, error: fetchErr } = await supabase
    .from("contracts")
    .select("hired_id, contractor_id")
    .eq("id", contractId)
    .single();
  if (fetchErr || !row) throw new Error("Contrato não encontrado");
  if (row.contractor_id !== actorId) {
    throw new Error("Só o contratante pode processar o pagamento.");
  }
  const hiredId = row.hired_id as string;
  const { method, amount } = input;

  if (method === "saldo" && amount > 0) {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("profile_id", actorId)
      .single();
    if (!wallet) throw new Error("Carteira não encontrada");
    const balance = Number(wallet.balance);
    if (balance < amount) throw new Error("Saldo insuficiente");
    const newBalance = round2(balance - amount);

    await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      profile_id: actorId,
      type: "debit",
      status: "completed",
      amount,
      balance_before: balance,
      balance_after: newBalance,
      description: `Débito para contrato #${contractId.slice(0, 8)}`,
      contract_id: contractId,
    });
    const { data: pay } = await supabase
      .from("contract_payments")
      .insert({
        contract_id: contractId,
        amount,
        method: "wallet_balance",
        status: "completed",
        payer_id: actorId,
        payee_id: hiredId,
        confirmed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    await supabase
      .from("contracts")
      .update({ payment_status: "completed" })
      .eq("id", contractId);
    return { paymentId: pay?.id as string };
  }

  // card / pix / cash — record intent only; cash settles at end
  const dbMethod =
    method === "cartao" ? "card" : method === "pix" ? "pix" : "cash";

  const { data: pay } = await supabase
    .from("contract_payments")
    .insert({
      contract_id: contractId,
      amount: amount > 0 ? amount : 0,
      method: dbMethod,
      status: "pending_request",
      stripe_payment_intent_id:
        input.stripePaymentIntentId ?? input.pixPaymentIntentId ?? null,
      payer_id: actorId,
      payee_id: hiredId,
    })
    .select("id")
    .single();

  return { paymentId: pay?.id as string };
}

// ── finalizeContract: draft → pending_signature ────────────────────────────
export async function finalizeContract(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  audit?: AuditSnapshot,
): Promise<{ hiredId: string; serviceName: string }> {
  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select("hired_id, contractor_id, service:provider_services!service_id(nome)")
    .eq("id", contractId)
    .single();
  if (fetchError || !contract) throw new Error("Contrato não encontrado");
  if (contract.contractor_id !== actorId) {
    throw new Error("Só o contratante pode finalizar o rascunho.");
  }

  const { error: updateError } = await supabase
    .from("contracts")
    .update({ status: "pending_signature" })
    .eq("id", contractId)
    .eq("status", "draft");
  if (updateError) throw new Error(updateError.message);

  await supabase.from("contract_deliveries").insert({
    contract_id: contractId,
    recipient_id: contract.hired_id,
    status: "pending",
    delivered_at: new Date().toISOString(),
  });

  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: "contractor",
    eventType: "created",
    audit,
  });

  return {
    hiredId: contract.hired_id as string,
    serviceName: ((contract as { service?: { nome?: string } }).service?.nome) ?? "serviço",
  };
}

// ── startContract (legacy: cria + ativa imediatamente) ────────────────────
export type StartContractInput = CreateDraftInput & {
  initialStatus?: "active" | "pending_signature";
};

export async function startContract(
  supabase: SupabaseClient,
  actorId: string,
  input: StartContractInput,
  audit?: AuditSnapshot,
): Promise<{ id: string; needsCardIntent: boolean; preAmount: number; payeeId: string | null }> {
  const isDefinido = input.type === "timer";
  const initialStatus = input.initialStatus ?? "active";
  const billingTrigger = isDefinido ? "on_start" : "on_end";

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      contractor_id: actorId,
      hired_id: input.hiredProfileId,
      type: isDefinido ? "defined" : "open",
      status: initialStatus,
      hourly_rate: input.ratePerHour,
      total_hours: input.duracaoTotalMs ? input.duracaoTotalMs / 3600000 : null,
      service_id: input.serviceId ?? null,
      payment_method: mapPaymentMethodDb(input.paymentMethod),
      payment_card_label: input.paymentCardLabel ?? null,
      billing_trigger: billingTrigger,
      agendado: input.agendado ?? false,
      scheduled_for: input.scheduledForMs
        ? new Date(input.scheduledForMs).toISOString()
        : null,
      started_at: initialStatus === "active" ? new Date().toISOString() : null,
      location: input.location ?? null,
      distance_km: input.distanceKm ?? null,
    })
    .select()
    .single();
  if (error || !contract) throw new Error(error?.message ?? "Falha ao criar contrato");

  await supabase.from("contract_parties").insert([
    { contract_id: contract.id, role: "contractor", user_id: actorId },
    { contract_id: contract.id, role: "hired", user_id: input.hiredProfileId },
  ]);

  // Pre-payment for defined contracts (billing on_start).
  let needsCardIntent = false;
  let preAmount = 0;
  const methodDb = mapPaymentMethodDb(input.paymentMethod);

  if (isDefinido && methodDb && input.duracaoTotalMs) {
    preAmount = round2((input.duracaoTotalMs / 3600000) * input.ratePerHour);

    if (preAmount > 0) {
      let prePaymentStatus: string;

      if (methodDb === "balance") {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("id, balance")
          .eq("profile_id", actorId)
          .maybeSingle();
        if (wallet && Number(wallet.balance) >= preAmount) {
          const prev = Number(wallet.balance);
          const newBalance = round2(prev - preAmount);
          await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
          await supabase.from("wallet_transactions").insert({
            wallet_id: wallet.id,
            profile_id: actorId,
            type: "payment",
            status: "completed",
            amount: preAmount,
            balance_before: prev,
            balance_after: newBalance,
            description: `Pagamento antecipado – contrato #${contract.id.slice(0, 8)}`,
            contract_id: contract.id,
          });
          prePaymentStatus = "confirmed";
        } else {
          prePaymentStatus = "pending_retry";
          await supabase
            .from("contracts")
            .update({ payment_status: "failed" })
            .eq("id", contract.id);
        }
      } else if (methodDb === "card") {
        prePaymentStatus = "pending_payment";
        needsCardIntent = true;
      } else if (methodDb === "pix") {
        prePaymentStatus = "pending_request";
      } else {
        prePaymentStatus = "awaiting_dual_confirmation";
      }

      await supabase.from("contract_payments").insert({
        contract_id: contract.id,
        payer_id: actorId,
        payee_id: input.hiredProfileId,
        method: methodForPayment(methodDb),
        amount: preAmount,
        status: prePaymentStatus,
        requested_by: actorId,
        confirmed_at:
          methodDb === "balance" && prePaymentStatus === "confirmed"
            ? new Date().toISOString()
            : null,
      });
    }
  }

  await recordEvent(supabase, {
    contractId: contract.id as string,
    actorId,
    actorRole: "contractor",
    eventType: initialStatus === "active" ? "started" : "created",
    audit,
  });

  return {
    id: contract.id as string,
    needsCardIntent,
    preAmount,
    payeeId: input.hiredProfileId,
  };
}

// ── Aceitar / Recusar / Iniciar ─────────────────────────────────────────────
export async function acceptContract(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  audit?: AuditSnapshot,
): Promise<{ contractorId: string | null; hiredId: string | null }> {
  await ensureParty(supabase, contractId, actorId);
  const { error } = await supabase
    .from("contracts")
    .update({ status: "accepted" })
    .eq("id", contractId);
  if (error) throw new Error(error.message);
  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: "hired",
    eventType: "accepted",
    audit,
  });
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return { contractorId: data?.contractor_id ?? null, hiredId: data?.hired_id ?? null };
}

export async function rejectContract(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  audit?: AuditSnapshot,
): Promise<{ contractorId: string | null; hiredId: string | null }> {
  await ensureParty(supabase, contractId, actorId);
  const { error } = await supabase
    .from("contracts")
    .update({ status: "rejected", ended_at: new Date().toISOString() })
    .eq("id", contractId);
  if (error) throw new Error(error.message);
  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: "hired",
    eventType: "rejected",
    audit,
  });
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return { contractorId: data?.contractor_id ?? null, hiredId: data?.hired_id ?? null };
}

export async function beginContract(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  audit?: AuditSnapshot,
): Promise<{ contractorId: string | null; hiredId: string | null }> {
  await ensureParty(supabase, contractId, actorId);
  const { error } = await supabase
    .from("contracts")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
      agendado: false,
    })
    .eq("id", contractId);
  if (error) throw new Error(error.message);
  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: "hired",
    eventType: "started",
    audit,
  });
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return { contractorId: data?.contractor_id ?? null, hiredId: data?.hired_id ?? null };
}

export async function cancelContract(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  audit?: AuditSnapshot,
): Promise<{ contractorId: string | null; hiredId: string | null }> {
  const role = await ensureParty(supabase, contractId, actorId);
  await supabase
    .from("contracts")
    .update({ status: "cancelled", ended_at: new Date().toISOString() })
    .eq("id", contractId);
  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "cancelled",
    audit,
  });
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return { contractorId: data?.contractor_id ?? null, hiredId: data?.hired_id ?? null };
}

// ── Solicitar / recusar encerramento ───────────────────────────────────────
async function createActionRequest(
  supabase: SupabaseClient,
  params: { contractId: string; type: string; requestedBy: string; reason?: string; amount?: number },
) {
  await supabase.from("contract_action_requests").insert({
    contract_id: params.contractId,
    type: params.type,
    requested_by: params.requestedBy,
    reason: params.reason ?? null,
    amount: params.amount ?? null,
  });
}

async function settleActionRequest(
  supabase: SupabaseClient,
  contractId: string,
  type: string,
  status: string,
  respondedBy: string,
  reason?: string,
) {
  await supabase
    .from("contract_action_requests")
    .update({
      status,
      responded_by: respondedBy,
      response_reason: reason ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq("contract_id", contractId)
    .eq("type", type)
    .eq("status", "pending");
}

export async function requestEndContract(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  reason: string,
  audit?: AuditSnapshot,
): Promise<{ contractorId: string | null; hiredId: string | null }> {
  const role = await ensureParty(supabase, contractId, actorId);
  const { error } = await supabase
    .from("contracts")
    .update({ status: "pending_end" })
    .eq("id", contractId);
  if (error) throw new Error(error.message);
  await createActionRequest(supabase, {
    contractId,
    type: "end",
    requestedBy: actorId,
    reason,
  });
  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "end_requested",
    reason,
    audit,
  });
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return { contractorId: data?.contractor_id ?? null, hiredId: data?.hired_id ?? null };
}

export async function rejectEndRequest(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  audit?: AuditSnapshot,
): Promise<{ contractorId: string | null; hiredId: string | null }> {
  const role = await ensureParty(supabase, contractId, actorId);
  const { error } = await supabase
    .from("contracts")
    .update({ status: "active" })
    .eq("id", contractId);
  if (error) throw new Error(error.message);
  await settleActionRequest(supabase, contractId, "end", "rejected", actorId);
  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "end_rejected",
    audit,
  });
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return { contractorId: data?.contractor_id ?? null, hiredId: data?.hired_id ?? null };
}

// ── Solicitar / confirmar / recusar cancelamento ───────────────────────────
export async function requestCancelContract(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  reason: string,
  audit?: AuditSnapshot,
) {
  const role = await ensureParty(supabase, contractId, actorId);
  const { error } = await supabase
    .from("contracts")
    .update({ status: "pending_cancel" })
    .eq("id", contractId);
  if (error) throw new Error(error.message);
  await createActionRequest(supabase, {
    contractId,
    type: "cancel",
    requestedBy: actorId,
    reason,
  });
  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "cancel_requested",
    reason,
    audit,
  });
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return { contractorId: data?.contractor_id ?? null, hiredId: data?.hired_id ?? null };
}

export async function confirmCancelContract(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  reason: string,
  audit?: AuditSnapshot,
) {
  const role = await ensureParty(supabase, contractId, actorId);
  const { error } = await supabase
    .from("contracts")
    .update({ status: "cancelled", ended_at: new Date().toISOString() })
    .eq("id", contractId);
  if (error) throw new Error(error.message);
  await settleActionRequest(supabase, contractId, "cancel", "accepted", actorId, reason);
  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "cancel_confirmed",
    reason,
    audit,
  });
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return { contractorId: data?.contractor_id ?? null, hiredId: data?.hired_id ?? null };
}

export async function rejectCancelRequest(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  reason: string | undefined,
  audit?: AuditSnapshot,
) {
  const role = await ensureParty(supabase, contractId, actorId);
  const { error } = await supabase
    .from("contracts")
    .update({ status: "active" })
    .eq("id", contractId);
  if (error) throw new Error(error.message);
  await settleActionRequest(supabase, contractId, "cancel", "rejected", actorId, reason);
  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "cancel_rejected",
    reason: reason ?? null,
    audit,
  });
  const { data } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return { contractorId: data?.contractor_id ?? null, hiredId: data?.hired_id ?? null };
}

// ── Pagamentos em dinheiro ─────────────────────────────────────────────────
async function ensureCashPayment(
  supabase: SupabaseClient,
  contractId: string,
  actorId: string,
): Promise<{
  id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
}> {
  const { data: existing } = await supabase
    .from("contract_payments")
    .select("id, payer_id, payee_id, amount")
    .eq("contract_id", contractId)
    .eq("method", "cash")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as { id: string; payer_id: string; payee_id: string; amount: number };

  const { data: contract } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id, total_amount, hourly_rate, total_hours")
    .eq("id", contractId)
    .single();
  if (!contract) throw new Error("Contrato não encontrado");

  const amount =
    Number(contract.total_amount ?? 0) ||
    round2(Number(contract.hourly_rate ?? 0) * Number(contract.total_hours ?? 0));

  const { data: created, error } = await supabase
    .from("contract_payments")
    .insert({
      contract_id: contractId,
      payer_id: contract.contractor_id,
      payee_id: contract.hired_id,
      method: "cash",
      amount,
      status: "awaiting_dual_confirmation",
      requested_by: actorId,
    })
    .select("id, payer_id, payee_id, amount")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Falha ao criar pagamento em dinheiro");
  return created as { id: string; payer_id: string; payee_id: string; amount: number };
}

export async function reportCashPaid(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  amountReported: number,
  audit?: AuditSnapshot,
) {
  const role = await ensureParty(supabase, contractId, actorId);
  const payment = await ensureCashPayment(supabase, contractId, actorId);

  await supabase.from("contract_payment_confirmations").upsert(
    {
      payment_id: payment.id,
      user_id: actorId,
      role: "payer",
      confirmation_type: "paid",
      amount_reported: amountReported,
      is_incomplete: false,
      ...(audit ?? {}),
    },
    { onConflict: "payment_id,user_id" },
  );

  const { data: payeeConf } = await supabase
    .from("contract_payment_confirmations")
    .select("amount_reported")
    .eq("payment_id", payment.id)
    .eq("user_id", payment.payee_id)
    .maybeSingle();

  const payeeAmount = payeeConf?.amount_reported ?? null;
  const bothConfirmed = payeeAmount !== null;
  const amountsMatch =
    bothConfirmed && Math.abs(amountReported - Number(payeeAmount)) < 0.02;
  const hasInconsistency = bothConfirmed && !amountsMatch;

  await supabase
    .from("contract_payments")
    .update({
      status: amountsMatch ? "confirmed" : "awaiting_payee_confirmation",
      payer_amount_reported: amountReported,
      has_inconsistency: hasInconsistency,
      confirmed_at: amountsMatch ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  await supabase
    .from("contracts")
    .update({
      payment_status: amountsMatch ? "paid" : "awaiting_confirmation",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  if (amountsMatch) {
    await settleActionRequest(supabase, contractId, "payment", "accepted", actorId);
  }

  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "payment_confirmed",
    metadata: { amount_reported: amountReported, role: "payer", match: amountsMatch },
    audit,
  });

  const { data: c } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return {
    amountsMatch,
    contractorId: c?.contractor_id ?? null,
    hiredId: c?.hired_id ?? null,
  };
}

export async function reportCashReceived(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  amountReceived: number,
  isIncomplete: boolean,
  audit?: AuditSnapshot,
) {
  const role = await ensureParty(supabase, contractId, actorId);
  const payment = await ensureCashPayment(supabase, contractId, actorId);

  await supabase.from("contract_payment_confirmations").upsert(
    {
      payment_id: payment.id,
      user_id: actorId,
      role: "payee",
      confirmation_type: isIncomplete ? "denied" : "received",
      amount_reported: amountReceived,
      is_incomplete: isIncomplete,
      ...(audit ?? {}),
    },
    { onConflict: "payment_id,user_id" },
  );

  const { data: payerConf } = await supabase
    .from("contract_payment_confirmations")
    .select("amount_reported")
    .eq("payment_id", payment.id)
    .eq("user_id", payment.payer_id)
    .maybeSingle();

  const payerAmount = payerConf?.amount_reported ?? null;
  const bothConfirmed = payerAmount !== null;
  const amountsMatch =
    bothConfirmed && !isIncomplete && Math.abs(amountReceived - Number(payerAmount)) < 0.02;
  const hasInconsistency = bothConfirmed && !amountsMatch;

  await supabase
    .from("contract_payments")
    .update({
      status: amountsMatch ? "confirmed" : "awaiting_payer_confirmation",
      payee_amount_reported: amountReceived,
      has_inconsistency: hasInconsistency,
      confirmed_at: amountsMatch ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  await supabase
    .from("contracts")
    .update({
      payment_status: amountsMatch ? "paid" : "awaiting_confirmation",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  if (amountsMatch) {
    await settleActionRequest(supabase, contractId, "payment", "accepted", actorId);
  }

  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "payment_confirmed",
    metadata: {
      amount_reported: amountReceived,
      role: "payee",
      is_incomplete: isIncomplete,
      match: amountsMatch,
    },
    audit,
  });

  const { data: c } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return {
    amountsMatch,
    contractorId: c?.contractor_id ?? null,
    hiredId: c?.hired_id ?? null,
  };
}

export async function confirmCashPayment(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  audit?: AuditSnapshot,
) {
  const role = await ensureParty(supabase, contractId, actorId);
  const payment = await ensureCashPayment(supabase, contractId, actorId);
  const userRole = actorId === payment.payer_id ? "payer" : "payee";
  const confirmationType = userRole === "payer" ? "paid" : "received";

  await supabase.from("contract_payment_confirmations").upsert(
    {
      payment_id: payment.id,
      user_id: actorId,
      role: userRole,
      confirmation_type: confirmationType,
      ...(audit ?? {}),
    },
    { onConflict: "payment_id,user_id" },
  );

  const { data: confs } = await supabase
    .from("contract_payment_confirmations")
    .select("user_id, confirmation_type")
    .eq("payment_id", payment.id);

  const payerConfirmed = confs?.some(
    (c) => c.user_id === payment.payer_id && c.confirmation_type === "paid",
  );
  const payeeConfirmed = confs?.some(
    (c) => c.user_id === payment.payee_id && c.confirmation_type === "received",
  );
  const confirmed = !!payerConfirmed && !!payeeConfirmed;
  const nextStatus = confirmed
    ? "confirmed"
    : payerConfirmed
      ? "awaiting_payee_confirmation"
      : "awaiting_payer_confirmation";

  await supabase
    .from("contract_payments")
    .update({
      status: nextStatus,
      confirmed_at: confirmed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  await supabase
    .from("contracts")
    .update({ payment_status: confirmed ? "paid" : "awaiting_confirmation" })
    .eq("id", contractId);

  if (confirmed) {
    await settleActionRequest(supabase, contractId, "payment", "accepted", actorId);
  }

  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "payment_confirmed",
    metadata: { payment_id: payment.id, confirmation_type: confirmationType, payment_status: nextStatus },
    audit,
  });

  const { data: c } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return {
    confirmed,
    paymentId: payment.id,
    contractorId: c?.contractor_id ?? null,
    hiredId: c?.hired_id ?? null,
  };
}

export async function disputeCashPayment(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  reason: string,
  audit?: AuditSnapshot,
) {
  const role = await ensureParty(supabase, contractId, actorId);
  const payment = await ensureCashPayment(supabase, contractId, actorId);
  const againstUserId = role === "contractor" ? payment.payee_id : payment.payer_id;

  await supabase
    .from("contract_payments")
    .update({ status: "disputed", updated_at: new Date().toISOString() })
    .eq("id", payment.id);

  await supabase
    .from("contracts")
    .update({ status: "disputed", payment_status: "disputed" })
    .eq("id", contractId);

  await supabase.from("contract_disputes").insert({
    contract_id: contractId,
    payment_id: payment.id,
    opened_by: actorId,
    against_user_id: againstUserId,
    reason,
    category: "payment_not_received",
  });

  await settleActionRequest(supabase, contractId, "payment", "rejected", actorId, reason);

  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "payment_disputed",
    reason,
    metadata: { payment_id: payment.id },
    audit,
  });

  const { data: c } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id")
    .eq("id", contractId)
    .single();
  return {
    contractorId: c?.contractor_id ?? null,
    hiredId: c?.hired_id ?? null,
    paymentId: payment.id,
    againstUserId,
  };
}

// ── Trocar método de pagamento ─────────────────────────────────────────────
export async function changePaymentMethod(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  newMethod: string,
  cardLabel: string | undefined,
  audit?: AuditSnapshot,
) {
  const role = await ensureParty(supabase, contractId, actorId);
  const dbMethod = mapPaymentMethodDb(newMethod);
  if (!dbMethod) throw new Error("Método inválido");

  const { data: contract } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id, total_amount, hourly_rate, total_hours")
    .eq("id", contractId)
    .single();
  if (!contract) throw new Error("Contrato não encontrado");

  await supabase
    .from("contracts")
    .update({
      payment_method: dbMethod,
      payment_card_label: newMethod === "cartao" ? (cardLabel ?? null) : null,
      payment_status: newMethod !== "dinheiro" ? "paid" : "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  if (newMethod !== "dinheiro") {
    const { data: existing } = await supabase
      .from("contract_payments")
      .select("id")
      .eq("contract_id", contractId)
      .limit(1)
      .maybeSingle();

    const amount =
      Number(contract.total_amount ?? 0) ||
      round2(Number(contract.hourly_rate ?? 0) * Number(contract.total_hours ?? 0));

    if (!existing) {
      await supabase.from("contract_payments").insert({
        contract_id: contractId,
        payer_id: contract.contractor_id,
        payee_id: contract.hired_id,
        method: methodForPayment(dbMethod),
        amount,
        status: "confirmed",
        requested_by: actorId,
        confirmed_at: new Date().toISOString(),
      });
    } else {
      await supabase
        .from("contract_payments")
        .update({
          method: methodForPayment(dbMethod),
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
  }

  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "payment_confirmed",
    metadata: { new_method: newMethod, method_changed: true },
    audit,
  });

  return {
    contractorId: contract.contractor_id ?? null,
    hiredId: contract.hired_id ?? null,
  };
}

// ── Pagar saldo pendente ───────────────────────────────────────────────────
export async function payPendingBalance(
  supabase: SupabaseClient,
  actorId: string,
  contractId: string,
  audit?: AuditSnapshot,
) {
  const role = await ensureParty(supabase, contractId, actorId);
  const { data: contract } = await supabase
    .from("contracts")
    .select("contractor_id, hired_id, payment_method, pending_extra_amount")
    .eq("id", contractId)
    .single();
  if (!contract) throw new Error("Contrato não encontrado");
  const pendingAmount = Number(contract.pending_extra_amount ?? 0);
  if (!pendingAmount || pendingAmount <= 0) {
    throw new Error("Nenhum valor pendente neste contrato");
  }

  const { data: pendingPayment } = await supabase
    .from("contract_payments")
    .select("id, method")
    .eq("contract_id", contractId)
    .eq("status", "pending_retry")
    .limit(1)
    .maybeSingle();
  if (!pendingPayment) throw new Error("Registro de pagamento pendente não encontrado");

  if (contract.payment_method === "balance") {
    const payerId = contract.contractor_id as string;
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("profile_id", payerId)
      .maybeSingle();
    if (!wallet || Number(wallet.balance) < pendingAmount) {
      throw new Error(`Saldo insuficiente. Disponível: ${Number(wallet?.balance ?? 0).toFixed(2)}`);
    }
    const prev = Number(wallet.balance);
    const newBalance = round2(prev - pendingAmount);
    await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      profile_id: payerId,
      type: "payment",
      status: "completed",
      amount: pendingAmount,
      balance_before: prev,
      balance_after: newBalance,
      description: `Pagamento excedente – contrato #${contractId.slice(0, 8)}`,
      contract_id: contractId,
    });
  }

  await supabase
    .from("contract_payments")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pendingPayment.id);

  await supabase
    .from("contracts")
    .update({
      payment_status: "paid",
      pending_extra_amount: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  await recordEvent(supabase, {
    contractId,
    actorId,
    actorRole: role,
    eventType: "payment_confirmed",
    metadata: { pending_amount: pendingAmount, method: contract.payment_method },
    audit,
  });

  return {
    contractorId: contract.contractor_id ?? null,
    hiredId: contract.hired_id ?? null,
  };
}
