import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const defaultAllowedOriginPatterns = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/.*\.replit\.dev$/,
  /^https?:\/\/.*\.replit\.app$/,
  /^https?:\/\/.*\.railway\.app$/,
  /^https?:\/\/.*\.expo\.dev$/,
];

function patternFromEnvOrigin(origin: string): RegExp {
  const trimmed = origin.trim();
  const escaped = trimmed
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

const envAllowedOriginPatterns = (process.env["CORS_ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(patternFromEnvOrigin);

const allowedOriginPatterns = [
  ...defaultAllowedOriginPatterns,
  ...envAllowedOriginPatterns,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Native mobile apps send no Origin header — always allow
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed = allowedOriginPatterns.some((pattern) => pattern.test(origin));
      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed — ${origin}`));
      }
    },
    credentials: true,
  })
);

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature header." });
      return;
    }

    if (!Buffer.isBuffer(req.body)) {
      res.status(500).json({ error: "Stripe webhook payload was not received as raw bytes." });
      return;
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body, sig);
      res.status(200).json({ received: true });
    } catch (error) {
      req.log.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Stripe webhook failed.",
      );
      res.status(400).json({ error: "Webhook processing failed." });
    }
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.get("/", (_req, res) => {
  res.json({
    name: "Krono API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/api/healthz",
      stripeConfig: "/api/stripe/config",
      stripeWebhook: "/api/stripe/webhook",
    },
  });
});

export default app;
