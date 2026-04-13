# Khrono — Replit Project

## Overview
Khrono is a mobile-first service marketplace platform built with Expo (React Native). It connects contractors and service providers, handles real-time contracts, availability sessions, push notifications, and an in-app wallet.

## Project Structure
This is a **pnpm monorepo** with the following packages:

| Path | Purpose | Framework |
|---|---|---|
| `artifacts/khrono` | Primary mobile app | Expo / React Native |
| `artifacts/api-server` | Backend API / Expo proxy | Express.js |
| `artifacts/mockup-sandbox` | UI component previewer | Vite / React / Tailwind |
| `lib/api-spec` | OpenAPI spec + codegen | Orval |
| `lib/api-zod` | Zod schemas from OpenAPI | Zod |
| `lib/api-client-react` | TanStack Query client | React Query |
| `supabase/migrations` | Database schema migrations | PostgreSQL / Supabase |

## Tech Stack
- **Mobile**: Expo SDK 54, React Native 0.81, expo-router (file-based routing)
- **Backend**: Express.js v5, pino logging
- **Database/Auth**: Supabase (PostgreSQL, Auth, Realtime)
- **State/Data**: TanStack Query v5
- **Language**: TypeScript throughout

## Running the App
The workflow `Start application` starts the Expo Metro bundler on port 5000. The app can be viewed:
- **Mobile**: Scan the QR code from the workflow logs with Expo Go
- **Web**: Available at port 5000 (React Native Web)

The expo-proxy script also runs on port 22861 to proxy Metro traffic.

## Environment Variables & Secrets
All secrets are stored in Replit Secrets (never hardcoded):

| Key | Type | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Env var (shared) | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Secret | Supabase anonymous/public key |
| `SUPABASE_ACCESS_TOKEN` | Secret | Supabase personal access token (for MCP server) |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Env var (shared) | EAS project ID (optional) |
| `PORT` | Env var (shared) | App port (5000) |
| `EXPO_METRO_PORT` | Env var (shared) | Metro bundler proxy port (22861) |

## Database
- **Supabase** is used for authentication, realtime subscriptions, and the primary database
- Migrations are in `supabase/migrations/` and must be applied via the Supabase dashboard or CLI
- A Replit PostgreSQL database was provisioned but is not actively used (Supabase handles all data)

## Key Features
- Provider/contractor marketplace with real-time contracts
- Availability sessions with GPS-based provider discovery
- In-app wallet (BRL) with card and PIX support
- Push notifications via Expo Notifications
- QR code / PIN-based contract initiation
- Skills, services, and tools catalog

## Architecture Notes
- The Supabase client (`lib/supabase.ts`) runs on the client (mobile) side, using the public anon key + Supabase RLS for security
- All sensitive operations are protected by Supabase Row Level Security (RLS) policies
- The Express API server (`artifacts/api-server`) handles backend routes and proxies Expo Metro traffic
