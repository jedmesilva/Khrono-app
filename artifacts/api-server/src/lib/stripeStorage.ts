import { query } from "./db";

export type StripePaymentLink = {
  contract_id: string;
  stripe_payment_intent_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  customer_id: string | null;
  payer_profile_id: string | null;
  payee_profile_id: string | null;
  metadata: Record<string, unknown>;
};

export async function ensureStripeApplicationTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS public.stripe_payment_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id text NOT NULL,
      stripe_payment_intent_id text NOT NULL UNIQUE,
      amount_cents integer NOT NULL CHECK (amount_cents > 0),
      currency text NOT NULL DEFAULT 'brl',
      status text NOT NULL,
      customer_id text,
      payer_profile_id text,
      payee_profile_id text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_stripe_payment_links_contract
      ON public.stripe_payment_links (contract_id, created_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_stripe_payment_links_status
      ON public.stripe_payment_links (status)
  `);
}

export async function upsertStripePaymentLink(link: StripePaymentLink) {
  const result = await query(
    `
      INSERT INTO public.stripe_payment_links (
        contract_id,
        stripe_payment_intent_id,
        amount_cents,
        currency,
        status,
        customer_id,
        payer_profile_id,
        payee_profile_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      ON CONFLICT (stripe_payment_intent_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        customer_id = EXCLUDED.customer_id,
        metadata = EXCLUDED.metadata,
        updated_at = now()
      RETURNING *
    `,
    [
      link.contract_id,
      link.stripe_payment_intent_id,
      link.amount_cents,
      link.currency,
      link.status,
      link.customer_id,
      link.payer_profile_id,
      link.payee_profile_id,
      JSON.stringify(link.metadata),
    ],
  );

  return result.rows[0] ?? null;
}

export async function updateStripePaymentLinkStatus(
  paymentIntentId: string,
  status: string,
) {
  const result = await query(
    `
      UPDATE public.stripe_payment_links
      SET status = $2, updated_at = now()
      WHERE stripe_payment_intent_id = $1
      RETURNING *
    `,
    [paymentIntentId, status],
  );

  return result.rows[0] ?? null;
}

export async function getStripePaymentLinksForContract(contractId: string) {
  const result = await query(
    `
      SELECT *
      FROM public.stripe_payment_links
      WHERE contract_id = $1
      ORDER BY created_at DESC
    `,
    [contractId],
  );

  return result.rows;
}