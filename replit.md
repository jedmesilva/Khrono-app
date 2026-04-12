# Krono App — Replit Environment

## Project Overview
Krono is a service marketplace mobile app (React Native/Expo) connecting contractors with service providers. Monorepo with pnpm workspaces.

## Architecture

### Workspace Structure
```
artifacts/
  khrono/          # Expo/React Native mobile app (main product)
  api-server/      # Express API server (port 8080)
  mockup-sandbox/  # Vite component preview server (port 8081)
lib/
  db/              # Drizzle ORM schema + PostgreSQL (Replit DB)
  api-spec/        # OpenAPI spec (source of truth)
  api-zod/         # Generated Zod schemas
  api-client-react/ # Generated React Query hooks
supabase/
  migrations/      # SQL migration history (applied to Supabase)
```

### Tech Stack
- **Frontend**: React Native, Expo SDK 54, Expo Router, React Query
- **Auth & App Data**: Supabase client integration retained for the imported mobile app
- **Replit Database**: Built-in PostgreSQL provisioned and available via `DATABASE_URL`
- **API Server**: Express + TypeScript (tsx)
- **Tooling**: pnpm workspaces, TypeScript, Orval codegen

## Running the App

### Main workflow: "Start application"
```
node artifacts/khrono/server/expo-proxy.js & PORT=5000 pnpm --filter @workspace/khrono run dev
```
- Expo Metro runs on port 5000
- Proxy bridges port 22861 → 5000 for the Replit preview

### Other workflows
- `artifacts/api-server: API Server` — Express API on port 8080
- `artifacts/mockup-sandbox: Component Preview Server` — Vite on port 8081

## Database

### Supabase (primary — auth + app data)
- Project: `hbekmqzdoxcsznykuxdj` (Krono app)
- URL: `https://hbekmqzdoxcsznykuxdj.supabase.co`
- All app data reads/writes go through `@supabase/supabase-js` client
- Auth: Supabase Auth (email/phone OTP)

### Replit PostgreSQL
- Provisioned for the migrated Replit environment
- Available to server-side code through `DATABASE_URL`
- No Drizzle schema package is currently present in this import

## Environment Variables & Secrets

### Env vars (non-sensitive, in .replit [userenv.shared])
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `PORT` — Main app port (5000)
- `EXPO_METRO_PORT` — Metro bundler port (22861)
- `NODE_ENV` — development

### Secrets (in Replit Secrets)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key (used in app)
- `EXPO_SUPABASE_ACESS_TOKEN` — Supabase Management API token for applying remote SQL migrations
- `EXPO_SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key for privileged server-side/database maintenance
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Replit PostgreSQL

## Migration Notes
- Dependencies were installed from the existing `pnpm-lock.yaml`.
- The main Replit workflow starts Expo Metro on port 5000.
- A root Expo route now redirects to `/auth` so the Replit preview opens to a rendered screen instead of a blank root route.
- No Supabase Edge Function calls are present in the imported codebase.

## Supabase Schema (all migrations applied)

### Core Tables
- `profiles` — user profiles (created by auth trigger)
- `provider_profiles` — provider stats (valor_base, nota, avaliacoes)
- `provider_services` — services offered (nome, valor_hora, nota, is_active)
- `provider_tools` — tools owned by provider (nome, tipo, is_available)
- `provider_locations` — provider service location (realtime/fixed)
- `service_skills` — N:N service ↔ skills_catalog
- `service_tools` — N:N service ↔ provider_tools
- `skills_catalog` — 20 skill types (public read)
- `services_catalog` — 20 service types (public read)
- `tools_catalog` — 21 vehicle/tool/equipment templates (public read)
- `user_skills` — skills linked to a user profile
- `user_services` — services linked to a user profile
- `user_settings` — per-user persisted preferences for notifications, theme, haptics, 2FA, biometrics, and facial recognition
- `contracts` — service contracts between users
- `contract_time_entries` — time tracking events
- `wallets` — one per user, BRL currency
- `wallet_cards` — saved payment cards (metadata only)
- `wallet_transactions` — deposit/withdrawal/payment history

### New Tables
- `availability_sessions` — histórico de sessões de disponibilidade do prestador (status, GPS, PIN, timestamps)

### Applied Migrations (in order)
1. `20260408_catalog_tables.sql` — skills/services catalogs + user link tables
2. `20260409_contracts_schema_fixes.sql` — status constraints, indexes
3. `20260409_fix_contracts_and_trigger.sql` — auth trigger, profile backfill
4. `20260409_provider_locations.sql` — provider location table
5. `20260409_wallet_tables.sql` — wallet system
6. `20260412_service_schema_redesign.sql` — valor_hora, provider_tools, service_skills/tools, dropped old columns
7. `20260412_tools_catalog.sql` — tools catalog + default templates
8. `20260412_user_settings.sql` — persisted per-user settings/preferences
9. `20260412_availability_sessions.sql` — availability session history (status, GPS, PIN, timestamps)

## Code Generation
```bash
pnpm --filter @workspace/api-spec run codegen
```
Regenerates `lib/api-zod` and `lib/api-client-react` from `lib/api-spec/openapi.yaml`.
