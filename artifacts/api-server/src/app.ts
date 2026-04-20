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
app.use(cors());

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
