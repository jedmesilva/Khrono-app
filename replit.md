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
- All Supabase keys are stored as Replit secrets
- The `.replit` file previously contained a hardcoded Supabase access token — this token should be rotated via the Supabase dashboard
- RLS is enabled on all tables; users can only access their own data
