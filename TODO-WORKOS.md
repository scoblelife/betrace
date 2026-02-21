# WorkOS AuthKit Integration — Setup Task

## Goal
Replace the hand-rolled WorkOS SSO integration with AuthKit (WorkOS's official React SDK) for production-ready auth.

## Current State ✅
- `@workos-inc/authkit-react` installed and integrated
- `AuthKitProvider` wraps app when `VITE_WORKOS_CLIENT_ID` is set
- Auth context delegates to AuthKit's `useAuth()` in WorkOS mode, falls back to demo mode otherwise
- Callback route handles AuthKit's automatic OAuth flow
- Go backend has JWT validation middleware using WorkOS JWKS
- Demo mode preserved and working (no WorkOS credentials needed)

## Completed ✅

### Code Changes
- [x] Replace `WorkOSAuthService` with `AuthKitProvider` wrapper
- [x] Update `main.tsx` to wrap app in `AuthKitProvider` (conditional)
- [x] Replace custom auth context with AuthKit's `useAuth()` hook (with demo fallback)
- [x] Keep demo mode fallback (check `VITE_WORKOS_CLIENT_ID` presence)
- [x] Update callback route to use AuthKit's built-in handler
- [x] Map WorkOS user/org to BeTrace User/Tenant types
- [x] Switch from `@workos-inc/node` to `@workos-inc/authkit-react`
- [x] Add JWT validation middleware in Go backend (`backend/internal/middleware/auth.go`)
- [x] Extract tenant ID from JWT claims for multi-tenancy
- [x] Pass-through for demo mode (no auth required)
- [x] Wire auth middleware into server
- [x] Update `.env.example` files

## Remaining — Manual Steps (requires WorkOS account)

### 1. WorkOS Dashboard Setup
- [ ] Create WorkOS account at https://workos.com
- [ ] Create a new project for BeTrace
- [ ] Get credentials: `WORKOS_CLIENT_ID`
- [ ] Set redirect URI: `http://localhost:5173` (dev) + production URL
- [ ] Add allowed origins: `http://localhost:5173`
- [ ] Configure authentication methods (email+password, Google OAuth, SSO)

### 2. Deploy Configuration
- [ ] Set `VITE_WORKOS_CLIENT_ID` in production environment
- [ ] Set `WORKOS_CLIENT_ID` on Go backend in production
- [ ] Remove `DEMO_MODE=true` from production

## Environment Variables
```env
# BFF (Vite)
VITE_WORKOS_CLIENT_ID=client_xxxxx

# Backend (Go)
WORKOS_CLIENT_ID=client_xxxxx
DEMO_MODE=false  # set to true for demo mode
```

## Reference
- AuthKit React: https://github.com/workos/authkit-react
- AuthKit Docs: https://workos.com/docs/authkit
- WorkOS pricing: Free up to 1M MAUs for AuthKit
