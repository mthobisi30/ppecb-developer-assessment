import type { AuthUser } from './authApi.ts'

export type AuthStatus = 'loading' | 'authenticated' | 'signedOut' | 'error'

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  error: string | null
}

export type AuthAction =
  | { type: 'loading' }
  | { type: 'authenticated'; user: AuthUser }
  | { type: 'signedOut' }
  | { type: 'error'; message: string }

export const initialAuthState: AuthState = {
  status: 'loading',
  user: null,
  error: null,
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'loading':
      return {
        ...state,
        status: 'loading',
        error: null,
      }
    case 'authenticated':
      return {
        status: 'authenticated',
        user: action.user,
        error: null,
      }
    case 'signedOut':
      return {
        status: 'signedOut',
        user: null,
        error: null,
      }
    case 'error':
      return {
        status: 'error',
        user: null,
        error: action.message,
      }
  }
}
