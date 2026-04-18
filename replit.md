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

## Database
Supabase is used for auth, PostgreSQL, and Realtime. Migrations are in `supabase/migrations/`. The app uses Supabase's Row Level Security (RLS) policies for authorization.

## Security Notes
- All Supabase keys are stored as Replit secrets (EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN)
- The `.replit` file contains a hardcoded Supabase MCP access token — **rotate this token in the Supabase dashboard** (Settings > Access Tokens)
- RLS is enabled on all tables; users can only access their own data
- The Supabase anon key is safe to expose in the mobile app — all access control is enforced by RLS policies on the database

## Replit Migration Notes (April 2025)
- Dependencies installed via `pnpm install` (1174 packages)
- App runs successfully: Metro on port 5000, Expo proxy on port 22861
- Supabase kept as the backend (Auth, Realtime, RLS) — migrating to Replit PostgreSQL would break auth and realtime subscriptions
- No hardcoded secrets found in source code

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
