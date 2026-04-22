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

## Contracts Backend Migration (April 2026)
All contract/payment business logic was moved out of the mobile app into the API server. The mobile `ContractsContext` is now a thin shell that loads/realtime-syncs data and dispatches notifications/broadcasts after API calls.
- **Backend service**: `artifacts/api-server/src/lib/contractsService.ts` owns the entire contract lifecycle (draft, finalize, accept/reject/begin/cancel, request/confirm/reject end & cancel, cash flows, payment-method change, pay-pending) plus audit snapshots and `contract_events` recording.
- **REST routes**: `artifacts/api-server/src/routes/contracts.ts` exposes one endpoint per operation under `/api/contracts/*`. All endpoints use `requireAuth` + ownership check.
- **Frontend wrapper**: `artifacts/krono/lib/contractsApi.ts` provides typed methods for every endpoint. Audit snapshot (GPS/device) is captured client-side and sent as a payload field.
- **Stripe specifics**: card PaymentIntents are still created from the mobile app via `stripeApi` (Stripe SDK requires `clientSecret` client-side). The backend records the payment row with the resulting intent id. Settlement on contract end uses the existing `/api/stripe/contracts/:id/settle-end` route via `settleContractEnd`.
- **Result**: `ContractsContext.tsx` shrunk from 2329 → ~1325 lines; backend `pnpm typecheck` passes; mobile `tsc --noEmit` shows no errors in any contract-related file.

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

## Backend Migration — Ondas 1-5 (April 2026)
All business logic that was running directly on the mobile client has been moved to the API server. The mobile app is becoming a thin client that authenticates via Supabase and only calls REST endpoints for writes; Supabase Realtime is kept on the client for read-only postgres_changes / broadcast subscriptions. All server writes use `service_role`.

Mock data deletion: `constants/mockUsers.ts`, `context/CardsContext.tsx`, and the `PROVIDERS`/`MY_PROFILE` arrays inside `constants/profile-data.ts` were removed (only types + `VERIFICATION_LABELS` remain).

REST convention: routes are mounted at `/api` via `app.use("/api", router)`, so individual route files declare paths WITHOUT the `/api` prefix (e.g. `router.get("/wallet")` becomes `/api/wallet`).

- **Onda 1 — Settings + Notifications + PushTokens**: `lib/expoPush.ts`, `routes/settings.ts`, `routes/notifications.ts`, `routes/pushTokens.ts` + `krono/lib/{apiClient,settingsApi,notificationsApi}.ts`. `UserSettingsContext` + `NotificationsContext` refactored.
- **Onda 2 — Wallet**: `lib/walletService.ts` + `routes/wallet.ts` + `krono/lib/walletApi.ts`. `WalletContext` refactored.
- **Onda 3 — Availability + PINs**: `lib/availabilityService.ts` (Node `crypto.sha256` for QR checksum, server-side PIN generation with retry on unique-violation) + `routes/availability.ts` (`/availability/sessions/{start,end,pause,resume,regenerate-pin}`, `/availability/pins/used`, `/availability/profile-readiness`). `krono/lib/availabilityApi.ts` + `AvailabilityContext` refactored. Offline pending state and `provider_pins` Realtime watcher are preserved on the client; pin-used broadcast triggers `regeneratePin` via API.
- **Onda 4 — Location**: `lib/locationService.ts` + `routes/location.ts` (`GET/PUT /location`, `POST /location/realtime`). `krono/lib/locationApi.ts` + `LocationContext` refactored. GPS watch + 30 s / 50 m throttle stays client-side; throttled writes call `/location/realtime`.
- **Onda 5 — Profile catalog**: `lib/profileService.ts` + `routes/profile.ts`. Endpoints: `GET/PATCH /profile`, full CRUD on `/me/provider-services`, `/me/tools`, and `/me/skills` + `/me/user-services` (catalog picks). `krono/lib/profileApi.ts` + `UserCatalogContext` + `ServicesContext` refactored.

All endpoints validate JWT via `requireAuth` and scope writes to `req.userId`. Server build (`pnpm --filter @workspace/api-server run build`) bundles to ~924 KB. Mobile `tsc --noEmit` shows only pre-existing errors (definicoes Colors, wallet CardBandeira, profile/user-profile VerificationType+icon, _layout segment types, auth/index pointerEvents) — none introduced by these waves.
