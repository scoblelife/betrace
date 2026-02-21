// Auth context that delegates to WorkOS AuthKit when configured,
// or falls back to demo mode.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Tenant } from '@/lib/types/auth';
import { isWorkOSConfigured, mapWorkOSUser, mapWorkOSTenant, getDemoSession } from './workos';
import { AuthGuard, type Permission, type Role } from '@/lib/security/auth-guard';

// Conditionally import AuthKit hook — only used when WorkOS is configured
let useAuthKitHook: (() => any) | null = null;
if (isWorkOSConfigured) {
  // Dynamic import isn't needed; tree-shaking handles it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try {
    const authkit = await import('@workos-inc/authkit-react');
    useAuthKitHook = authkit.useAuth;
  } catch {
    console.warn('Failed to load AuthKit');
  }
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
}

interface AuthContextValue extends AuthState {
  login: (user: User, tenant: Tenant) => void;
  logout: () => void;
  enableDemoMode: () => void;
  signIn: () => void;
  getAccessToken: () => Promise<string | undefined>;
  canAccess: (permission: Permission) => boolean;
  hasMinRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Internal provider for WorkOS AuthKit mode.
 * Wraps AuthKit's useAuth() and maps to our context shape.
 */
function WorkOSAuthProviderInner({ children }: { children: React.ReactNode }) {
  const authkit = useAuthKitHook!();
  const [mappedUser, setMappedUser] = useState<User | null>(null);
  const [mappedTenant, setMappedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (authkit.user) {
      const user = mapWorkOSUser(authkit.user);
      setMappedUser(user);
      const orgId = authkit.user.organizationId || authkit.organizationId;
      if (orgId) {
        setMappedTenant(mapWorkOSTenant(orgId));
      }
    } else {
      setMappedUser(null);
      setMappedTenant(null);
    }
  }, [authkit.user, authkit.organizationId]);

  const value: AuthContextValue = {
    user: mappedUser,
    tenant: mappedTenant,
    isAuthenticated: !!authkit.user,
    isLoading: authkit.isLoading,
    isDemoMode: false,
    login: () => { /* handled by AuthKit */ },
    logout: () => authkit.signOut(),
    enableDemoMode: () => { /* not applicable in WorkOS mode */ },
    signIn: () => authkit.signIn(),
    getAccessToken: () => authkit.getAccessToken(),
    canAccess: (permission: Permission) => AuthGuard.hasPermission(mappedUser, permission),
    hasMinRole: (role: Role) => AuthGuard.hasMinRole(mappedUser, role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Internal provider for demo/local mode (no WorkOS).
 */
function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    isAuthenticated: false,
    isLoading: true,
    isDemoMode: false,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('betrace-auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(prev => ({ ...prev, ...parsed, isLoading: false }));
      } catch {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!state.isLoading) {
      localStorage.setItem('betrace-auth', JSON.stringify({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
        isDemoMode: state.isDemoMode,
      }));
    }
  }, [state.user, state.tenant, state.isAuthenticated, state.isDemoMode, state.isLoading]);

  const login = useCallback((user: User, tenant: Tenant) => {
    setState({ user, tenant, isAuthenticated: true, isLoading: false, isDemoMode: false });
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, tenant: null, isAuthenticated: false, isLoading: false, isDemoMode: false });
    localStorage.removeItem('betrace-auth');
  }, []);

  const enableDemoMode = useCallback(() => {
    const { user, tenant } = getDemoSession();
    setState({ user, tenant, isAuthenticated: true, isLoading: false, isDemoMode: true });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    enableDemoMode,
    signIn: () => { /* no-op in demo mode */ },
    getAccessToken: async () => undefined,
    canAccess: (permission: Permission) => AuthGuard.hasPermission(state.user, permission),
    hasMinRole: (role: Role) => AuthGuard.hasMinRole(state.user, role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Main AuthProvider — delegates to WorkOS or Demo based on configuration.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (isWorkOSConfigured && useAuthKitHook) {
    return <WorkOSAuthProviderInner>{children}</WorkOSAuthProviderInner>;
  }
  return <DemoAuthProvider>{children}</DemoAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
