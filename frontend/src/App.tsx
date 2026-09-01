import { useState } from 'react'
import { ApiError } from './api/index.ts'
import { AuthenticationPage, useAuth } from './features/auth/index.ts'
import { CategoryPage } from './features/categories/index.ts'
import { CatalogPage } from './features/catalog/index.ts'

function App() {
  const { error, logout, refresh, status, user } = useAuth()

  if (status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'signedOut') {
    return <AuthenticationPage />
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
  const [activeSection, setActiveSection] = useState<'products' | 'categories'>('products')
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
        <div className="app-header-main">
          <div className="application-name">
            <strong>PPECB</strong>
            <span>Product Catalogue</span>
          </div>
          <nav className="app-navigation" aria-label="Main navigation">
            <button
              aria-current={activeSection === 'products' ? 'page' : undefined}
              className="navigation-button"
              onClick={() => setActiveSection('products')}
              type="button"
            >
              Products
            </button>
            <button
              aria-current={activeSection === 'categories' ? 'page' : undefined}
              className="navigation-button"
              onClick={() => setActiveSection('categories')}
              type="button"
            >
              Categories
            </button>
          </nav>
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
        {logoutError !== null && (
          <p className="alert alert-error" role="alert">{logoutError}</p>
        )}
        {activeSection === 'products' ? <CatalogPage /> : <CategoryPage />}
      </main>
    </div>
  )
}

function getActionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export default App
