import type { AuthStatus } from './features/auth/index.ts'

export const appRoutes = {
  categories: '/categories',
  login: '/login',
  products: '/products',
  register: '/register',
} as const

export type RouteAccess = 'protected' | 'public'

interface LoginRouteState {
  registeredEmail: string
}

export function getRouteRedirect(
  status: AuthStatus,
  access: RouteAccess,
): string | null {
  if (status === 'authenticated' && access === 'public') {
    return appRoutes.products
  }

  if (status === 'signedOut' && access === 'protected') {
    return appRoutes.login
  }

  return null
}

export function getDefaultRoute(status: AuthStatus): string {
  return status === 'authenticated' ? appRoutes.products : appRoutes.login
}

export function getLoginRouteState(value: unknown): LoginRouteState {
  if (typeof value !== 'object' || value === null
    || !('registeredEmail' in value)
    || typeof value.registeredEmail !== 'string') {
    return { registeredEmail: '' }
  }

  return { registeredEmail: value.registeredEmail }
}
