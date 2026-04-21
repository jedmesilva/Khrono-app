import { supabase } from "@/lib/supabase";
import {
  createStripePaymentIntent as createStripePaymentIntentRequest,
  createStripePixIntent,
  createStripeSetupIntent as createStripeSetupIntentRequest,
  getStripeContractPayments,
  setAuthTokenGetter,
  setBaseUrl,
} from "@workspace/api-client-react";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

setBaseUrl(API_URL || null);
setAuthTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});

export type CreatePaymentIntentResult = {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
  amountCents: number;
  currency: string;
};

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
  return createStripePaymentIntentRequest({
    contractId: params.contractId,
    amount: params.amount,
    currency: "brl",
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    payerProfileId: params.payerProfileId,
    payeeProfileId: params.payeeProfileId,
    metadata: params.metadata,
  }).then((result) => ({
    ...result,
    clientSecret: result.clientSecret ?? "",
    amountCents: result.amountCents ?? Math.round(params.amount * 100),
    currency: result.currency ?? "brl",
  }));
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
  return createStripePixIntent({
    contractId: params.contractId,
    amount: params.amount,
    payerProfileId: params.payerProfileId,
    payeeProfileId: params.payeeProfileId,
  }) as Promise<CreatePixPaymentResult>;
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
  return createStripeSetupIntentRequest(params).then((result) => ({
    setupIntentId: result.setupIntentId,
    clientSecret: result.clientSecret ?? "",
  }));
}

export async function getStripePaymentIntentsForContract(
  contractId: string,
): Promise<{ data: { stripe_payment_intent_id: string; status: string; amount_cents: number }[] }> {
  if (!API_URL) return { data: [] };
  return getStripeContractPayments(contractId) as Promise<{ data: { stripe_payment_intent_id: string; status: string; amount_cents: number }[] }>;
}
