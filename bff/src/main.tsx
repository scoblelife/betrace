import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';

// TanStack Query for server state management
import { QueryProvider } from '@/lib/providers/query-client';

// WorkOS AuthKit provider (only active when VITE_WORKOS_CLIENT_ID is set)
import { isWorkOSConfigured, WORKOS_CLIENT_ID } from '@/lib/auth/workos';

// React Context for authentication (wraps AuthKit or demo mode)
import { AuthProvider } from '@/lib/auth/auth-context';

// Theme provider for light/dark mode
import { ThemeProvider } from '@/lib/theme/theme-context';

// Pyroscope profiling
import { initializeProfiling } from '@/lib/profiling/pyroscope-init';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

import './styles/globals.css';

// Conditionally import AuthKitProvider
let AuthKitProvider: React.ComponentType<{ clientId: string; children: React.ReactNode }> | null = null;
if (isWorkOSConfigured) {
  const mod = await import('@workos-inc/authkit-react');
  AuthKitProvider = mod.AuthKitProvider;
}

// Initialize profiling before React render
const profilingStatus = initializeProfiling();
if (profilingStatus.initialized) {
  console.log('[App] Profiling enabled');
} else if (profilingStatus.error) {
  console.log('[App] Profiling disabled:', profilingStatus.error);
}

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// TanStack-first app: Query + Router + WorkOS + Theme
function App() {
  const inner = (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );

  // Wrap in AuthKitProvider when WorkOS is configured
  if (AuthKitProvider && WORKOS_CLIENT_ID) {
    return (
      <AuthKitProvider clientId={WORKOS_CLIENT_ID}>
        {inner}
      </AuthKitProvider>
    );
  }

  return inner;
}

// Render immediately (no loading states, no async setup)
const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
