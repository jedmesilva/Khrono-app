import assert from "node:assert/strict";
import { SignJWT } from "jose";

async function main() {
  process.env["SUPABASE_JWT_SECRET"] ??= "smoke-secret";
  process.env["DATABASE_URL"] ??= "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

  const { default: app } = await import("../src/app");

  const server = await new Promise<import("node:http").Server>((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  try {
    const address = server.address();
    assert(address && typeof address === "object", "Server did not bind to a TCP port.");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthResponse = await fetch(`${baseUrl}/api/healthz`);
    assert.equal(healthResponse.status, 200, "Health endpoint should return 200.");
    const healthJson = (await healthResponse.json()) as { status?: string };
    assert.equal(healthJson.status, "ok", "Health payload should be { status: 'ok' }.");

    const token = await new SignJWT({ sub: "smoke-user" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode(process.env["SUPABASE_JWT_SECRET"]));

    const invalidIntentResponse = await fetch(`${baseUrl}/api/stripe/payment-intents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    assert.equal(
      invalidIntentResponse.status,
      400,
      "Stripe create payment intent should reject invalid payload with 400.",
    );

    const invalidIntentJson = (await invalidIntentResponse.json()) as { error?: string };
    assert.equal(
      invalidIntentJson.error,
      "Invalid payload for create payment intent.",
      "Stripe create payment intent should return the expected validation error message.",
    );

    console.log("API smoke checks passed.");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
