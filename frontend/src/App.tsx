import { useState } from 'react'
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { ApiError } from './api/index.ts'
import {
  LoginPage,
  RegistrationPage,
  useAuth,
} from './features/auth/index.ts'
import type { AuthStatus } from './features/auth/index.ts'
import { CategoryPage } from './features/categories/index.ts'
import { CatalogPage } from './features/catalog/index.ts'
import {
  appRoutes,
  getDefaultRoute,
  getLoginRouteState,
  getRouteRedirect,
} from './routing.ts'
import type { RouteAccess } from './routing.ts'

function App() {
  const { error, logout, refresh, status, user } = useAuth()

  if (status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'error') {
    return (
      <StatusScreen
        actionLabel="Try again"
        message={error ?? 'The current session could not be loaded.'}
        onAction={refresh}
        title="Unable to start the application"
      />
    )
  }

  return (
    <Routes>
      <Route element={<RouteGuard access="public" status={status} />}>
        <Route path={appRoutes.login} element={<LoginRoute />} />
        <Route path={appRoutes.register} element={<RegistrationRoute />} />
      </Route>
      <Route element={<RouteGuard access="protected" status={status} />}>
        <Route
          element={<ApplicationShell email={user?.email ?? ''} onLogout={logout} />}
        >
          <Route path={appRoutes.products} element={<CatalogPage />} />
          <Route path={appRoutes.categories} element={<CategoryPage />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={<Navigate to={getDefaultRoute(status)} replace />}
      />
    </Routes>
  )
}

interface RouteGuardProps {
  access: RouteAccess
  status: AuthStatus
}

function RouteGuard({ access, status }: RouteGuardProps) {
  const redirect = getRouteRedirect(status, access)
  return redirect === null ? <Outlet /> : <Navigate to={redirect} replace />
}

function LoginRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = getLoginRouteState(location.state)

  return (
    <LoginPage
      initialEmail={routeState.registeredEmail}
      notice={routeState.registeredEmail.length > 0
        ? 'Your account has been created. You can now sign in.'
        : null}
      onCreateAccount={() => navigate(appRoutes.register)}
    />
  )
}

function RegistrationRoute() {
  const navigate = useNavigate()

  return (
    <RegistrationPage
      onCancel={() => navigate(appRoutes.login)}
      onRegistered={(email) => navigate(appRoutes.login, {
        replace: true,
        state: { registeredEmail: email },
      })}
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
        <div className="app-header-main">
          <span className="application-name">Product Catalogue</span>
          <nav className="app-navigation" aria-label="Main navigation">
            <NavLink className="navigation-button" end to={appRoutes.products}>
              Products
            </NavLink>
            <NavLink className="navigation-button" end to={appRoutes.categories}>
              Categories
            </NavLink>
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
        <Outlet />
      </main>
    </div>
  )
}

function getActionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export default App
