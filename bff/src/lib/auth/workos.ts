// WorkOS AuthKit configuration
// When VITE_WORKOS_CLIENT_ID is set, the app uses WorkOS AuthKit for authentication.
// Otherwise, it falls back to demo mode.

import type { User, Tenant } from '../types/auth';

export const WORKOS_CLIENT_ID = import.meta.env.VITE_WORKOS_CLIENT_ID as string | undefined;
export const isWorkOSConfigured = !!WORKOS_CLIENT_ID;

/** Map a WorkOS AuthKit user object to our User type */
export function mapWorkOSUser(workosUser: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
  organizationId?: string | null;
}): User {
  return {
    id: workosUser.id,
    email: workosUser.email,
    firstName: workosUser.firstName ?? '',
    lastName: workosUser.lastName ?? '',
    profilePictureUrl: workosUser.profilePictureUrl ?? undefined,
    role: 'member', // Default role; can be enriched from WorkOS roles later
    tenantId: workosUser.organizationId ?? 'unknown',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Map a WorkOS organization to our Tenant type */
export function mapWorkOSTenant(orgId: string, orgName?: string): Tenant {
  return {
    id: orgId,
    name: orgName ?? orgId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Demo session for when WorkOS is not configured */
export function getDemoSession(): { user: User; tenant: Tenant } {
  return {
    user: {
      id: 'demo-user-1',
      email: 'demo@betrace.dev',
      firstName: 'Demo',
      lastName: 'User',
      profilePictureUrl: 'https://ui-avatars.com/api/?name=Demo+User&background=3b82f6&color=fff',
      role: 'admin',
      tenantId: 'demo-tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    tenant: {
      id: 'demo-tenant-1',
      name: 'Demo Organization',
      domain: 'demo.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}
