# Khrono Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is **Khrono** — a cross-platform time-based contracts mobile app (Expo/React Native) with a supporting Express API server and shared libraries.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile app**: Expo 54 / React Native 0.81 / Expo Router 6
- **API framework**: Express 5
- **Database**: PostgreSQL (Replit built-in) + Drizzle ORM
- **Auth & direct DB (mobile)**: Supabase (`@supabase/supabase-js`) — uses EXPO_PUBLIC_ anon keys
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Running the App

```
pnpm install
```

The main workflow ("Start application") runs:
```
node artifacts/khrono/server/expo-proxy.js & PORT=5000 pnpm --filter @workspace/khrono run dev
```

- Expo Metro bundler runs on port 5000
- expo-proxy.js listens on port 22861 (exposed as external port 80) and proxies to Metro
- The app serves both web (browser preview) and mobile (scan QR code with Expo Go)

## Environment Variables

- `DATABASE_URL` — Replit PostgreSQL (auto-provided by Replit)
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (public, safe to expose)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (public, safe to expose in mobile apps)

## Structure

```text
workspace/
├── artifacts/
│   ├── khrono/             # Expo React Native mobile app (main product)
│   │   ├── app/            # Expo Router screens
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React contexts (Auth, Contracts, Catalog, etc.)
│   │   ├── lib/supabase.ts # Supabase client (auth + DB for mobile)
│   │   ├── metro.config.js # Metro bundler config (CORS for Replit proxy)
│   │   └── server/         # expo-proxy.js + static serve
│   ├── api-server/         # Express API server (REST backend)
│   └── mockup-sandbox/     # Vite sandbox for UI prototyping
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── supabase/               # DB migrations (Supabase SQL schema)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck; JS bundling by esbuild/tsx/vite
- **Project references** — packages declare their cross-package dependencies via `references`

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/khrono` (`@workspace/khrono`)

Expo React Native mobile app — cross-platform time-based contracts app.

**Design system:** light background `#F8F5F2`, cards `#ffffff`, accent orange `#e06030`, accent green `#18a06b`, typography Sora (display/prices) + DM Sans (body/UI). Border radii: cards 24, icon containers 22, chips/badges 20.

**Key screens:**
- `app/(tabs)/index.tsx` — Home: live active contract cards with timers
- `app/(tabs)/hire.tsx` — Hire tab
- `app/contract-confirm.tsx` — Full contract confirmation flow
- `app/contract-detail/[id].tsx` — Contract detail view
- `app/history.tsx` — Contract history
- `app/auth/` — Auth screens (login, signup, password recovery)

**Contexts (`context/`):**
- `AuthContext.tsx` — Supabase auth state management
- `ContractsContext.tsx` — Active contracts + history, Supabase persistence
- `CatalogContext.tsx` — Skills + services catalog from Supabase
- `UserCatalogContext.tsx` — Per-user skills/services CRUD
- `HireSheetContext.tsx` — Controls HireSheet open/close
- `ConfirmationContext.tsx` — Passes provider data to contract-confirm

**Database tables (Supabase + Drizzle schema):**
- `profiles` — user profiles
- `provider_profiles` — provider-specific info (rates, rating, verified)
- `provider_pins` — PIN-to-provider mapping
- `provider_services` — services each provider offers
- `contracts` — time-based contracts between users
- `skills_catalog` — canonical skill templates
- `services_catalog` — canonical service templates
- `user_skills` — junction: user ↔ skills_catalog
- `user_services` — junction: user ↔ services_catalog

**DB push:**
```
pnpm --filter @workspace/db run push
```

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with Drizzle ORM for structured backend operations.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App: `src/app.ts` — CORS, JSON parsing, routes at `/api`, Expo Metro proxy
- Routes: `src/routes/health.ts` — `GET /api/healthz`
- `pnpm --filter @workspace/api-server run dev` — dev server
- `pnpm --filter @workspace/api-server run build` — esbuild bundle

### `lib/db` (`@workspace/db`)

Drizzle ORM schema + PostgreSQL connection. Uses `DATABASE_URL` (Replit auto-provision).

- `src/schema/profiles.ts` — profiles table
- `src/schema/contracts.ts` — contracts + provider tables
- `src/schema/catalog.ts` — catalog tables
- `drizzle.config.ts` — requires `DATABASE_URL`

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen. Run: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks from OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts. Run: `pnpm --filter @workspace/scripts run <script>`

## Test Provider

- Name: Jedme Silva
- PIN: `1257`
- Supabase profile ID: `a1884c2a-f50e-4343-9dd3-33b99af82360`
- Services: Montagem de Móveis + Desmontagem e Transporte
