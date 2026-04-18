import { runMigrations } from "stripe-replit-sync";
import { logger } from "./logger";
import { getStripeCredentials, getStripeSync } from "./stripeClient";
import { ensureStripeApplicationTables } from "./stripeStorage";

function getWebhookBaseUrl() {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];

  if (domain) {
    return `https://${domain}`;
  }

  if (process.env["REPLIT_DEV_DOMAIN"]) {
    return `https://${process.env["REPLIT_DEV_DOMAIN"]}`;
  }

  return null;
}

export async function initStripeInfrastructure() {
  const databaseUrl = process.env["DATABASE_URL"];

  if (!databaseUrl) {
    logger.warn("Stripe infrastructure skipped: DATABASE_URL is not configured.");
    return;
  }

  await ensureStripeApplicationTables();

  let credentials;
  try {
    credentials = await getStripeCredentials();
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Stripe credentials are not configured yet. API routes will return configuration errors until secrets are provided.",
    );
    return;
  }

  await runMigrations({ databaseUrl });

  const stripeSync = await getStripeSync();
  const webhookBaseUrl = getWebhookBaseUrl();

  if (webhookBaseUrl && credentials.source === "replit") {
    const webhook = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
    );
    logger.info({ webhookId: webhook.id }, "Stripe managed webhook configured.");
  } else if (!credentials.webhookSecret) {
    logger.warn(
      "STRIPE_WEBHOOK_SECRET is not configured. Stripe API calls will work, but webhook verification will fail until the webhook secret is added.",
    );
  }

  stripeSync.syncBackfill().catch((error) => {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Stripe backfill failed.",
    );
  });
}