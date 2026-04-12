# Khrono - App de Contratos

A cross-platform time-based contracts application (Khrono) built as a TypeScript pnpm monorepo.

## Architecture

### Monorepo Structure

```
artifacts/
  khrono/          - Expo 54 / React Native mobile app (main app)
  api-server/      - Express 5 backend API server
  mockup-sandbox/  - Vite + React UI prototyping sandbox

lib/
  db/              - Drizzle ORM schema + Replit PostgreSQL connection
  api-spec/        - OpenAPI spec + Orval codegen
  api-zod/         - Auto-generated Zod schemas
  api-client-react/ - Auto-generated React Query hooks
```

### Key Technologies
- **Mobile App**: Expo 54, React Native 0.81, Expo Router 6
- **Auth & Mobile DB**: Supabase (auth + real-time for mobile app)
- **Backend**: Express 5, Node.js, TypeScript
- **Database**: Replit PostgreSQL via Drizzle ORM
- **Monorepo**: pnpm workspaces
- **Validation**: Zod
- **ORM**: Drizzle ORM

### Database
- **Development/Production DB**: Replit-managed PostgreSQL (via `DATABASE_URL`)
- **Mobile Auth**: Supabase (using public anon key `EXPO_PUBLIC_SUPABASE_*`)
- Schema location: `lib/db/src/schema/`
  - `profiles.ts` - User profiles
  - `contracts.ts` - Contracts, provider profiles, services, locations
  - `catalog.ts` - Skills and services catalogs
  - `wallet.ts` - Wallets, cards, transactions

### Push DB Schema
```bash
pnpm --filter @workspace/db run push
```

## Running the App

The `Start application` workflow runs:
1. `node artifacts/khrono/server/expo-proxy.js` - Proxies port 22861 → Metro on port 5000
2. `PORT=5000 pnpm --filter @workspace/khrono run dev` - Starts Expo Metro bundler

The app is accessible via the Replit preview pane (web version via React Native Web).

## Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL (public, safe to expose)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public, safe to expose)
- `DATABASE_URL` - Replit PostgreSQL connection string (secret, managed by Replit)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - Replit PG credentials

## Port Configuration
- Port 5000: Metro bundler / main app entry point
- Port 22861: Expo proxy (tunnels to Metro)
- Port 8080/8081: Reserved for API server

## Notes
- The Supabase client is used in the mobile app for auth and real-time data (appropriate pattern for mobile)
- The Replit PostgreSQL database has the same schema as Supabase (synced via Drizzle)
- The API server (`api-server`) uses the Replit PostgreSQL via Drizzle ORM for server-side operations
