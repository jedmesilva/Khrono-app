# Krono — Replit Project

## Overview
Krono is a mobile-first service marketplace platform (React Native / Expo) that connects contractors and service providers. It handles real-time contracts, availability sessions, push notifications, and an in-app wallet (BRL).

## Tech Stack
- **Mobile App**: Expo SDK 54 (React Native 0.81), `expo-router` for file-based routing
- **Backend API**: Express.js (v5) API server (`artifacts/api-server`) — runs on Replit port 5000
- **Database & Auth**: Supabase (PostgreSQL, Auth, Realtime, RLS) for the mobile app
- **Replit PostgreSQL**: Used by the API server (`DATABASE_URL`) for Stripe payment links
- **Payments**: Stripe (via `@stripe/stripe-react-native` on mobile + Express API server)
- **State Management**: TanStack Query v5
- **Language**: TypeScript throughout
- **Package Manager**: pnpm (monorepo)

## Project Structure
```
artifacts/
  krono/          — Expo mobile app (primary)
  api-server/     — Express.js backend (runs on Replit)
  mockup-sandbox/ — Vite component preview environment
lib/
  api-spec/       — OpenAPI definition (openapi.yaml)
  api-zod/        — Zod schemas generated from OpenAPI
  api-client-react/— TanStack Query hooks (generated)
supabase/
  migrations/     — PostgreSQL schema & RLS policies
```

## How to Run
The "Start application" workflow runs the API server:
```
PORT=5000 pnpm --filter @workspace/api-server run dev
```
- API server starts on port 5000 (web preview shows API status)
- Root endpoint: `GET /` returns API status JSON
- Health check: `GET /api/healthz`
- Stripe routes: `/api/stripe/*`

## API Endpoints
- `GET /` — API status page
- `GET /api/healthz` — Health check
- `GET /api/stripe/config` — Stripe configuration status
- `POST /api/stripe/payment-intents` — Create a payment intent
- `GET /api/stripe/payment-intents/:id` — Get payment intent
- `POST /api/stripe/payment-intents/:id/cancel` — Cancel payment intent
- `GET /api/stripe/contracts/:contractId/payments` — Get payments for contract
- `POST /api/stripe/webhook` — Stripe webhook receiver

## Environment Variables
Set in Replit secrets (do not hardcode):
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (set in shared env)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (secret)
- `EXPO_SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (secret)
- `SUPABASE_ACCESS_TOKEN` — Supabase personal access token (secret)
- `DATABASE_URL` — Replit PostgreSQL connection string (auto-provisioned)
- `STRIPE_SECRET_KEY` — Stripe secret key used only by the API server
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret for `/api/stripe/webhook`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key used by the mobile app

## Database
- **Supabase**: Used by the mobile app for auth, PostgreSQL, and Realtime. Migrations are in `supabase/migrations/`. RLS policies are enabled on all tables.
- **Replit PostgreSQL** (`DATABASE_URL`): Used by the API server to store Stripe payment links in `stripe_payment_links` table. Schema is created automatically on server startup via `ensureStripeApplicationTables()`.

## Security Notes
- All Supabase keys stored as Replit secrets (`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`).
- RLS is enabled on all Supabase tables; users can only access data allowed by policies.
- The Supabase anon key is designed to be exposed to the mobile app, but service-role and access tokens must never be shipped to the client.
- Stripe can be configured either through Replit's Stripe connection or through the `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` secrets. The server code supports both paths and never embeds credentials in source files.
- The Metro proxy middleware was removed from the API server (`app.ts`) — it's not needed since the mobile app connects to Expo Go directly on device.

## Replit Migration (April 2026)
- `pnpm install` completed, all workspace packages resolved.
- API server workflow configured to run `PORT=5000 pnpm --filter @workspace/api-server run dev`.
- The Metro proxy middleware was removed from `artifacts/api-server/src/app.ts` and replaced with a JSON status landing page at `GET /`.
- Replit PostgreSQL was provisioned; `DATABASE_URL` and Postgres env vars are available.
- Supabase is retained for the mobile app (Auth, Realtime, RLS are deeply integrated).
- All secrets (`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_SUPABASE_SERVICE_ROLE_KEY`, etc.) confirmed present.
- Server starts cleanly; only a non-blocking Stripe warning appears (expected until Stripe keys are added).

## Stripe Payment Flow
- `artifacts/krono/lib/stripeApi.ts` — helper that calls the API server to create/query PaymentIntents.
- `EXPO_PUBLIC_API_URL` must be set to the API server's public URL for the mobile app to communicate with it.
- Webhook at `POST /api/stripe/webhook` handles `payment_intent.succeeded` / `payment_intent.payment_failed` events.

## Skill & Tool Detail Screen (April 2026)
Both detail screens match the richness of `provider-service/[serviceId].tsx`:
- Hero section, active/available toggle, info grid, verification section, services list, edit CTA footer
- `user_skills.is_active` and `provider_tools.brand/model/manufacture_year/verification_status` — migration: `20260418_skill_active_tool_details.sql`

## Settings Screen (April 2026)
- Haptics respect `haptics_enabled` preference via `artifacts/krono/lib/haptics.ts`
- Push token rows store notification preferences; migration: `20260418_push_token_preferences.sql`
- Theme preference drives `ThemeContext` (`light`, `dark`, `system`)
