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
