import { Router, type IRouter } from "express";
import { getStripeCredentials, getUncachableStripeClient } from "../lib/stripeClient";
import {
  getStripePaymentLinksForContract,
  upsertStripePaymentLink,
} from "../lib/stripeStorage";
import { requireAuth } from "../middleware/auth";

type CreatePaymentIntentBody = {
  contractId?: string;
  amount?: number;
  amountCents?: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  payerProfileId?: string;
  payeeProfileId?: string;
  metadata?: Record<string, string>;
};

const router: IRouter = Router();

function normalizeAmountCents(body: CreatePaymentIntentBody) {
  if (typeof body.amountCents === "number") {
    return Math.round(body.amountCents);
  }

  if (typeof body.amount === "number") {
    return Math.round(body.amount * 100);
  }

  return 0;
}

router.get("/stripe/config", async (_req, res) => {
  try {
    const credentials = await getStripeCredentials();

    res.json({
      configured: true,
      publishableKey: credentials.publishableKey ?? null,
      source: credentials.source,
    });
  } catch (error) {
    res.status(503).json({
      configured: false,
      publishableKey: null,
      error: error instanceof Error ? error.message : "Stripe is not configured.",
    });
  }
});

router.post("/stripe/payment-intents", requireAuth, async (req, res) => {
  try {
    const body = req.body as CreatePaymentIntentBody;
    const contractId = body.contractId?.trim();
    const amountCents = normalizeAmountCents(body);
    const currency = (body.currency ?? "brl").toLowerCase();

    if (!contractId) {
      res.status(400).json({ error: "contractId is required." });
      return;
    }

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      res.status(400).json({ error: "amount or amountCents must be greater than zero." });
      return;
    }

    const stripe = await getUncachableStripeClient();
    let customerId: string | undefined;

    if (body.customerEmail) {
      const existing = await stripe.customers.list({
        email: body.customerEmail,
        limit: 1,
      });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: body.customerEmail,
          name: body.customerName,
          metadata: {
            payer_profile_id: body.payerProfileId ?? "",
          },
        });
        customerId = customer.id;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        contract_id: contractId,
        payer_profile_id: body.payerProfileId ?? "",
        payee_profile_id: body.payeeProfileId ?? "",
        ...(body.metadata ?? {}),
      },
    });

    await upsertStripePaymentLink({
      contract_id: contractId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: amountCents,
      currency,
      status: paymentIntent.status,
      customer_id: customerId ?? null,
      payer_profile_id: body.payerProfileId ?? null,
      payee_profile_id: body.payeeProfileId ?? null,
      metadata: paymentIntent.metadata,
    });

    res.status(201).json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      amountCents,
      currency,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create Stripe PaymentIntent.",
    });
  }
});

router.get("/stripe/payment-intents/:paymentIntentId", requireAuth, async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(
      req.params.paymentIntentId,
    );

    res.json({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amountCents: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to retrieve Stripe PaymentIntent.",
    });
  }
});

router.post("/stripe/payment-intents/:paymentIntentId/cancel", requireAuth, async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.cancel(
      req.params.paymentIntentId,
    );

    await upsertStripePaymentLink({
      contract_id: paymentIntent.metadata.contract_id ?? "unknown",
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      customer_id:
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id ?? null,
      payer_profile_id: paymentIntent.metadata.payer_profile_id ?? null,
      payee_profile_id: paymentIntent.metadata.payee_profile_id ?? null,
      metadata: paymentIntent.metadata,
    });

    res.json({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to cancel Stripe PaymentIntent.",
    });
  }
});

router.get("/stripe/contracts/:contractId/payments", requireAuth, async (req, res) => {
  const payments = await getStripePaymentLinksForContract(req.params.contractId);
  res.json({ data: payments });
});

export default router;