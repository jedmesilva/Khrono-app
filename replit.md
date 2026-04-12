# Krono App — Replit Environment

## Project Overview
Krono is a service marketplace mobile app (React Native/Expo) connecting contractors with service providers. It is preserved as an imported pnpm monorepo and adapted to run in Replit without rewriting the application.

## Architecture

### Workspace Structure
```
artifacts/
  khrono/          # Expo/React Native mobile app (main product)
  api-server/      # Express API server package (port 8080 when run separately)
  mockup-sandbox/  # Vite component preview server (port 8081)
lib/
  api-spec/        # OpenAPI spec (source of truth for generated API packages)
  api-zod/         # Generated Zod schemas
  api-client-react/ # Generated React Query hooks
supabase/
  migrations/      # SQL migration history from the original Supabase project
```

### Tech Stack
- **Frontend**: React Native, Expo SDK 54, Expo Router, React Query
- **Auth & App Data**: Existing Supabase client integration retained for the imported mobile app
- **Replit Database**: Built-in PostgreSQL provisioned and available via `DATABASE_URL` for future server-side work
- **API Server**: Express + TypeScript package is present but not part of the main preview workflow
- **Tooling**: pnpm workspaces, TypeScript, Orval codegen

## Running the App

### Main workflow: "Start application"
```
node artifacts/khrono/server/expo-proxy.js & PORT=5000 pnpm --filter @workspace/khrono run dev
```
- Expo Metro runs on port 5000
- Proxy bridges port 22861 → 5000 for Expo packager access
- The root route renders the existing auth entry screen so the Replit preview opens to a usable page

### Other packages
- `artifacts/api-server` — Express API package
- `artifacts/mockup-sandbox` — Vite component preview package

## Database

### Supabase (current app auth + app data)
- Project: `hbekmqzdoxcsznykuxdj` (Krono app)
- URL: `https://hbekmqzdoxcsznykuxdj.supabase.co`
- The imported mobile app uses `@supabase/supabase-js` with the public anon key and Supabase RLS policies
- No Supabase Edge Functions or `functions.invoke` calls were found in the imported codebase

### Replit PostgreSQL
- Provisioned for the migrated Replit environment
- Available to server-side code through `DATABASE_URL`
- This import does not include an active Drizzle schema/config or `db:push` script, so no database push step is available without adding new server-side architecture

## Environment Variables & Secrets

### Env vars (non-sensitive, shared)
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `PORT` — Main app port (5000)
- `EXPO_METRO_PORT` — Metro/proxy support port (22861)
- `NODE_ENV` — development

### Secrets
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key used by the mobile app
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Replit PostgreSQL connection values

## Migration Notes
- Dependencies were installed from the existing `pnpm-lock.yaml`.
- Expo dependency versions were aligned with Expo SDK 54 expectations to remove compatibility warnings on startup.
- The main Replit workflow starts Expo Metro on port 5000 and now runs without startup errors.
- The root Expo route renders the existing auth screen directly, so the Replit preview opens to a working page.
- The Supabase-to-Postgres checklist was reviewed. A full conversion would require rewriting the app's auth/data layer and replacing Supabase RLS/Auth behavior, so the existing Supabase architecture was preserved for this import.
- No Supabase Edge Function calls are present in the imported codebase.
- Required runtime Supabase configuration is stored via environment/secrets rather than hardcoded in app source files.
- `artifacts/khrono/server/prepare-dev-port.js` clears stale Expo Metro processes on port 5000 before startup.
- `artifacts/khrono/server/expo-proxy.js` tolerates an already-running preview proxy on port 22861 to avoid restart failures from orphaned background processes.

## Real-time Architecture

### Contrato criado (hired party)
- `ContractsContext` ouve `postgres_changes` (INSERT em `contracts` filtrado por `hired_id`) — funciona com REPLICA IDENTITY FULL.
- Após `startContract`, o contratante também envia um broadcast Supabase (`khrono-contract-events`, evento `contract-created`, payload `{ hired_id }`).
- O contratado ouve o broadcast e chama `loadContracts` imediatamente, sem depender apenas do postgres_changes.

### PIN usado / regeneração
- `AvailabilityContext` ouve `postgres_changes` (UPDATE em `provider_pins` filtrado por `profile_id`) — funciona com REPLICA IDENTITY FULL.
- Quando o contratante usa o PIN, chama `notifyPinUsed(profileId)` (exposto via `useAvailability()`), que envia broadcast Supabase (`khrono-availability-events`, evento `pin-used`, payload `{ profile_id }`).
- O prestador recebe o broadcast e regenera o PIN instantaneamente.
- O polling de 10s foi removido — não há mais re-render periódico do QR Code / PIN.

### Banco configurado (aplicado via Management API)
- `ALTER TABLE contracts REPLICA IDENTITY FULL` ✅
- `ALTER TABLE provider_pins REPLICA IDENTITY FULL` ✅
- `ALTER TABLE availability_sessions REPLICA IDENTITY FULL` ✅
- As três tabelas já estavam na publicação `supabase_realtime`.

## Availability Readiness
- Prestadores só podem iniciar disponibilidade quando têm pelo menos 1 serviço ativo em `provider_services`.
- Se o perfil ainda não estiver pronto, a ativação abre `ProfileReadinessSheet` em vez de criar sessão, PIN ou QR Code.
- A aba de perfil exibe um card de checklist enquanto falta serviço ativo; o card some quando o prestador já pode receber contratos.
- Ao salvar um novo serviço, a lista de serviços e a prontidão do perfil são atualizadas imediatamente.

## Supabase Schema (migration history retained)

### Core Tables
- `profiles` — user profiles (created by auth trigger)
- `provider_profiles` — provider stats (valor_base, nota, avaliacoes)
- `provider_services` — services offered (nome, valor_hora, nota, is_active)
- `provider_tools` — tools owned by provider (nome, tipo, is_available)
- `provider_locations` — provider service location (realtime/fixed)
- `service_skills` — N:N service ↔ skills_catalog
- `service_tools` — N:N service ↔ provider_tools
- `skills_catalog` — skill types (public read)
- `services_catalog` — service types (public read)
- `tools_catalog` — vehicle/tool/equipment templates (public read)
- `user_skills` — skills linked to a user profile
- `user_services` — services linked to a user profile
- `user_settings` — per-user persisted preferences
- `contracts` — service contracts between users
- `contract_time_entries` — time tracking events
- `wallets` — one per user, BRL currency
- `wallet_cards` — saved payment cards metadata
- `wallet_transactions` — deposit/withdrawal/payment history
- `availability_sessions` — provider availability session history

## Code Generation
```bash
pnpm --filter @workspace/api-spec run codegen
```
Regenerates `lib/api-zod` and `lib/api-client-react` from `lib/api-spec/openapi.yaml`.
