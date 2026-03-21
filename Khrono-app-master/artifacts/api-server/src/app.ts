import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

const EXPO_METRO_PORT = process.env["EXPO_METRO_PORT"] ?? "22861";
const EXPO_METRO_URL = `http://localhost:${EXPO_METRO_PORT}`;

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(
  createProxyMiddleware({
    target: EXPO_METRO_URL,
    changeOrigin: true,
    ws: true,
    on: {
      error: (_err, _req, res) => {
        if (res && "status" in res && typeof res.status === "function") {
          res.status(502).json({ error: "Expo Metro server not available" });
        }
      },
    },
  }),
);

export default app;
