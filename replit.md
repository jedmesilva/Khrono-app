# Khrono — Replit Project

## Overview
Khrono is a mobile-first service marketplace platform (React Native / Expo) that connects contractors and service providers. It handles real-time contracts, availability sessions, push notifications, and an in-app wallet (BRL).

## Tech Stack
- **Mobile App**: Expo SDK 54 (React Native 0.81), `expo-router` for file-based routing
- **Backend**: Express.js (v5) API server + Metro proxy (`artifacts/api-server`)
- **Database & Auth**: Supabase (PostgreSQL, Auth, Realtime, RLS)
- **State Management**: TanStack Query v5
- **Language**: TypeScript throughout
- **Package Manager**: pnpm (monorepo)

## Project Structure
```
artifacts/
  khrono/          — Expo mobile app (primary)
  api-server/      — Express.js backend + Metro proxy
  mockup-sandbox/  — Vite component preview environment
lib/
  api-spec/        — OpenAPI definition (openapi.yaml)
  api-zod/         — Zod schemas generated from OpenAPI
  api-client-react/— TanStack Query hooks (generated)
supabase/
  migrations/      — PostgreSQL schema & RLS policies
```

## How to Run
The "Start application" workflow runs:
```
node artifacts/khrono/server/expo-proxy.js & PORT=5000 pnpm --filter @workspace/khrono run dev
```
- Metro bundler starts on port 5000 (web preview)
- Expo proxy on port 22861 for Expo Go connections

## Environment Variables
Set in Replit secrets (do not hardcode):
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (set in shared env)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (secret)
- `EXPO_SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (secret)
- `SUPABASE_ACCESS_TOKEN` — Supabase personal access token (secret)
- `STRIPE_SECRET_KEY` — Stripe secret key used only by the API server
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret for `/api/stripe/webhook`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key used by the mobile app

## Database
Supabase is used for auth, PostgreSQL, and Realtime. Migrations are in `supabase/migrations/`. The app uses Supabase's Row Level Security (RLS) policies for authorization.

## Security Notes
- All Supabase keys should be stored as Replit secrets (`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`).
- The `.replit` file still contains a Supabase MCP access token from the imported project configuration. `.replit` is protected in this environment, so rotate this token in the Supabase dashboard (Settings > Access Tokens) before using that MCP configuration again.
- RLS is enabled on all Supabase tables; users can only access data allowed by policies.
- The Supabase anon key is designed to be exposed to the mobile app, but service-role and access tokens must never be shipped to the client.
- Stripe can be configured either through Replit's Stripe connection or through the requested secrets above. The server code supports both paths and never embeds Stripe credentials in source files.

## Replit Migration Notes (April 2026)
- Workspace dependencies were installed via `pnpm install` from the existing lockfile.
- The "Start application" workflow was restarted and verified running successfully.
- Preview endpoint returned HTTP 200 through the Replit development domain.
- Replit PostgreSQL was provisioned and `DATABASE_URL`/Postgres environment variables are available.
- Supabase was retained for app runtime because the current mobile app depends directly on Supabase Auth, Realtime subscriptions, RLS policies, and existing migrations. Replacing those with server-side PostgreSQL/Drizzle would be a major product migration and would risk breaking auth/realtime behavior during import.
- No Supabase Edge Function source directory was found in the imported project.
- Import migration checklist was completed after dependency installation, workflow restart, environment variable verification, log review, and HTTP 200 preview validation.

## Skill & Tool Detail Screen Refactor (April 2026)
Both detail screens were rewritten to match the richness of `provider-service/[serviceId].tsx`:
- **Hero section**: 220px gradient, decorative oversized text, pill badges for status/category, back + options buttons with frosted style
- **Active/Available toggle**: Prominent Switch card below hero (no longer buried in options menu)
- **Info grid**: 2-column cards for category/type, added-at date, brand/model/year for tools
- **Verification section**: Skills verify automatically via community reviews; tools verify via Khrono documentation flow with a "Request Verification" CTA
- **Services list** (skill screen): lists services using that skill with navigation to each
- **Edit CTA footer**: Fixed bottom bar with "Editar skill" / "Editar ferramenta" button

### Data model additions
- `user_skills.is_active` (bool, default true) — migration: `supabase/migrations/20260418_skill_active_tool_details.sql`
- `provider_tools.brand`, `model`, `manufacture_year`, `verification_status`, `verified_at` — same migration
- `Tool` interface updated in `constants/profile-data.ts`
- `UserSkillEntry.isActive` added to `UserCatalogContext`
- `toggleSkillActive(entryId, isActive)` added to `UserCatalogContext`
- `toggleToolAvailable(id, available)`, `removeTool(id)`, `requestToolVerification(id)` added to `ServicesContext`

## Settings Screen Behavior Updates (April 2026)
- Haptics now use `artifacts/khrono/lib/haptics.ts`, which respects the user's `haptics_enabled` preference globally.
- Notification settings now affect in-app filtering and push token handling through `NotificationsContext`.
- Push token rows can store `notification_push_enabled`, `notification_contracts_enabled`, and `notification_schedule_enabled`; migration: `supabase/migrations/20260418_push_token_preferences.sql`.
- Security toggles for 2FA, biometrics, and facial recognition now show an explanatory alert instead of saving a fake enabled state.
- `UserSettingsProvider` wraps `NotificationsProvider` in `app/_layout.tsx` so notifications can read user preferences.
- Theme preference now drives `ThemeContext` (`light`, `dark`, or `system`) and the settings screen cycles through those modes from "Tema do app".
