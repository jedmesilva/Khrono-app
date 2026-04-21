import { supabase } from "@/lib/supabase";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type CreatePaymentIntentResult = {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
  amountCents: number;
  currency: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function createStripePaymentIntent(params: {
  contractId: string;
  amount: number;
  customerEmail?: string;
  customerName?: string;
  payerProfileId?: string;
  payeeProfileId?: string;
  metadata?: Record<string, string>;
}): Promise<CreatePaymentIntentResult> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL não está configurado.");
  }

  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/api/stripe/payment-intents`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contractId: params.contractId,
      amount: params.amount,
      currency: "brl",
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      payerProfileId: params.payerProfileId,
      payeeProfileId: params.payeeProfileId,
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ??
        `Falha ao criar PaymentIntent (HTTP ${res.status})`,
    );
  }

  return res.json() as Promise<CreatePaymentIntentResult>;
}

export type CreatePixPaymentResult = {
  paymentIntentId: string;
  clientSecret: string;
  pixCode: string | null;
  pixQrImageUrl: string | null;
  expiresAt: number | null;
};

export async function createStripePixPayment(params: {
  contractId: string;
  amount: number;
  payerProfileId?: string;
  payeeProfileId?: string;
}): Promise<CreatePixPaymentResult> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL não está configurado.");
  }

  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/api/stripe/pix-intents`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contractId: params.contractId,
      amount: params.amount,
      currency: "brl",
      payerProfileId: params.payerProfileId,
      payeeProfileId: params.payeeProfileId,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ??
        `Falha ao criar pagamento Pix (HTTP ${res.status})`,
    );
  }

  return res.json() as Promise<CreatePixPaymentResult>;
}

export type CreateSetupIntentResult = {
  setupIntentId: string;
  clientSecret: string;
};

export async function createStripeSetupIntent(params: {
  customerEmail?: string;
  customerName?: string;
  payerProfileId?: string;
}): Promise<CreateSetupIntentResult> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL não está configurado.");
  }

  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/api/stripe/setup-intents`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ??
        `Falha ao criar SetupIntent (HTTP ${res.status})`,
    );
  }

  return res.json() as Promise<CreateSetupIntentResult>;
}

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

export async function settleContractEnd(
  contractId: string,
  reason?: string,
): Promise<SettlementResult> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL não está configurado.");
  }

  const headers = await getAuthHeaders();

  const res = await fetch(
    `${API_URL}/api/contracts/${encodeURIComponent(contractId)}/end`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ reason }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ??
        `Falha ao encerrar contrato (HTTP ${res.status})`,
    );
  }

  return res.json() as Promise<SettlementResult>;
}

export async function getStripePaymentIntentsForContract(
  contractId: string,
): Promise<{ data: { stripe_payment_intent_id: string; status: string; amount_cents: number }[] }> {
  if (!API_URL) return { data: [] };

  const headers = await getAuthHeaders();

  const res = await fetch(
    `${API_URL}/api/stripe/contracts/${encodeURIComponent(contractId)}/payments`,
    { headers },
  );

  if (!res.ok) return { data: [] };

  return res.json();
}
