import { useState } from 'react'
import { ApiError } from './api/index.ts'
import { LoginPage, useAuth } from './features/auth/index.ts'

function App() {
  const { error, logout, refresh, status, user } = useAuth()

  if (status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'signedOut') {
    return <LoginPage />
  }

  if (status === 'authenticated' && user !== null) {
    return <ApplicationShell email={user.email} onLogout={logout} />
  }

  return (
    <StatusScreen
      actionLabel="Try again"
      message={error ?? 'The current session could not be loaded.'}
      onAction={refresh}
      title="Unable to start the application"
    />
  )
}

function LoadingScreen() {
  return (
    <main className="status-screen" aria-busy="true" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>Loading your session...</p>
    </main>
  )
}

interface StatusScreenProps {
  actionLabel: string
  message: string
  onAction: () => Promise<void>
  title: string
}

function StatusScreen({
  actionLabel,
  message,
  onAction,
  title,
}: StatusScreenProps) {
  const [isWorking, setIsWorking] = useState(false)

  async function handleAction() {
    setIsWorking(true)

    try {
      await onAction()
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <main className="status-screen">
      <div className="status-card" role="alert">
        <h1>{title}</h1>
        <p>{message}</p>
        <button
          className="button button-primary"
          disabled={isWorking}
          onClick={() => void handleAction()}
          type="button"
        >
          {isWorking ? 'Trying again...' : actionLabel}
        </button>
      </div>
    </main>
  )
}

interface ApplicationShellProps {
  email: string
  onLogout: () => Promise<void>
}

function ApplicationShell({ email, onLogout }: ApplicationShellProps) {
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    setLogoutError(null)

    try {
      await onLogout()
    } catch (error) {
      setLogoutError(getActionErrorMessage(error, 'You could not be signed out.'))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="application-name">
          <strong>PPECB</strong>
          <span>Product Catalogue</span>
        </div>
        <div className="account-menu">
          <span>{email}</span>
          <button
            className="button button-secondary"
            disabled={isLoggingOut}
            onClick={() => void handleLogout()}
            type="button"
          >
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </header>
      <main className="app-content">
        <h1>Product catalogue</h1>
        <p className="page-introduction">
          View and maintain the products registered in the catalogue.
        </p>
        {logoutError !== null && (
          <p className="alert alert-error" role="alert">{logoutError}</p>
        )}
      </main>
    </div>
  )
}

function getActionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export default App
