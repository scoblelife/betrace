# WorkOS AuthKit Integration — Setup Task

## Goal
Replace the hand-rolled WorkOS SSO integration with AuthKit (WorkOS's official React SDK) for production-ready auth.

## Current State
- `@workos-inc/node` in package.json (server-side SDK)
- Custom `WorkOSAuthService` class in `bff/src/lib/auth/workos.ts`
- Manual SSO flow: generate auth URL → redirect → callback → exchange code
- Demo mode fallback when `VITE_WORKOS_CLIENT_ID` is not set ✅
- Auth context with user/tenant/role/permissions ✅

## What Needs to Happen

### 1. WorkOS Dashboard Setup
- [ ] Create WorkOS account at https://workos.com
- [ ] Create a new project for BeTrace
- [ ] Get credentials: `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`
- [ ] Set redirect URI: `http://localhost:5173/auth/callback` (dev) + production URL
- [ ] Add allowed origins: `http://localhost:5173`
- [ ] Configure authentication methods (email+password, Google OAuth, SSO)

### 2. Switch to AuthKit React SDK
```bash
cd bff
pnpm remove @workos-inc/node
pnpm add @workos-inc/authkit-react
```

### 3. Code Changes
- [ ] Replace `WorkOSAuthService` with `AuthKitProvider` wrapper
- [ ] Update `main.tsx` to wrap app in `AuthKitProvider`
- [ ] Replace custom auth context with AuthKit's `useAuth()` hook
- [ ] Keep demo mode fallback (check `VITE_WORKOS_CLIENT_ID` presence)
- [ ] Update callback route to use AuthKit's built-in handler
- [ ] Map WorkOS user/org to BeTrace User/Tenant types

### 4. Environment Variables
```env
# Required for WorkOS (production)
VITE_WORKOS_CLIENT_ID=client_xxxxx

# Optional — enables demo mode when WorkOS is not configured
VITE_DEMO_MODE=true
```

### 5. Backend Auth Middleware (Go)
The Go backend needs to validate WorkOS JWTs on API requests:
- [ ] Add JWT validation middleware using WorkOS JWKS endpoint
- [ ] Extract tenant ID from JWT claims for multi-tenancy
- [ ] Pass-through for demo mode (no auth required)

### Key Files to Modify
- `bff/src/main.tsx` — Add AuthKitProvider
- `bff/src/lib/auth/auth-context.tsx` — Simplify, delegate to AuthKit
- `bff/src/lib/auth/workos.ts` — Replace with AuthKit config
- `bff/src/routes/auth.tsx` — Simplify login page
- `bff/src/routes/auth/callback.tsx` — Use AuthKit callback
- `backend/internal/middleware/` — Add JWT validation

### Reference
- AuthKit React: https://github.com/workos/authkit-react
- AuthKit Docs: https://workos.com/docs/authkit
- WorkOS pricing: Free up to 1M MAUs for AuthKit
