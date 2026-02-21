import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { isWorkOSConfigured } from '@/lib/auth/workos'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: (search.code as string) || '',
      state: (search.state as string) || '',
      error: (search.error as string) || '',
      error_description: (search.error_description as string) || '',
    }
  },
})

function AuthCallbackPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()
  const { error, error_description } = Route.useSearch()
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (error) {
      setAuthError(error_description || error)
      setTimeout(() => navigate({ to: '/auth' }), 3000)
      return
    }

    // When using AuthKit, the provider handles the code exchange automatically.
    // Once authenticated, redirect to dashboard.
    if (!isLoading && isAuthenticated) {
      navigate({ to: '/dashboard' })
    }

    // If not using WorkOS and no auth, redirect to login
    if (!isLoading && !isAuthenticated && !isWorkOSConfigured) {
      navigate({ to: '/auth' })
    }
  }, [isAuthenticated, isLoading, error, error_description, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">BeTrace</h1>
          <p className="mt-2 text-sm text-gray-600">
            Processing authentication...
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {authError ? (
            <div className="text-center">
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <h3 className="font-medium mb-2">Authentication Error</h3>
                <p className="text-sm">{authError}</p>
              </div>
              <p className="text-sm text-gray-600">
                Redirecting to login page...
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Completing sign in...
              </h3>
              <p className="text-sm text-gray-600">
                Please wait while we set up your session
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
