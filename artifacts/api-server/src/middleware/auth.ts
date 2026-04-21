import type { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SUPABASE_JWT_SECRET = process.env["SUPABASE_JWT_SECRET"];

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!SUPABASE_URL) return null;
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/jwks`)
    );
  }
  return jwks;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({ error: "Missing authorization token." });
    return;
  }

  if (SUPABASE_JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
      });
      (req as any).userId = payload.sub;
      next();
      return;
    } catch {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }
  }

  const remoteJwks = getJwks();
  if (remoteJwks) {
    try {
      const { payload } = await jwtVerify(token, remoteJwks, {
        algorithms: ["RS256"],
      });
      (req as any).userId = payload.sub;
      next();
      return;
    } catch {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }
  }

  next();
}
