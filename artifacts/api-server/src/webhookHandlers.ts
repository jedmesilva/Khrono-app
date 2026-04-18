import Stripe from "stripe";
import { getStripeSync, getUncachableStripeClient } from "./lib/stripeClient";
import { updateStripePaymentLinkStatus } from "./lib/stripeStorage";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error("Stripe webhook payload must be a Buffer.");
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

    if (!webhookSecret) {
      return;
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    await WebhookHandlers.processApplicationEvent(event);
  }

  private static async processApplicationEvent(event: Stripe.Event) {
    if (
      event.type !== "payment_intent.succeeded" &&
      event.type !== "payment_intent.payment_failed" &&
      event.type !== "payment_intent.canceled" &&
      event.type !== "payment_intent.processing"
    ) {
      return;
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    await updateStripePaymentLinkStatus(paymentIntent.id, paymentIntent.status);
  }
}