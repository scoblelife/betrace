// Auth configuration — WorkOS AuthKit handles auth client-side now.
// This file retains config shape for any server-side needs.

export const authConfig = {
  workos: {
    clientId: import.meta.env.VITE_WORKOS_CLIENT_ID || '',
  },
  session: {
    cookieName: 'betrace-session',
  },
} as const;

export const isConfigValid = () => {
  return !!import.meta.env.VITE_WORKOS_CLIENT_ID;
};
