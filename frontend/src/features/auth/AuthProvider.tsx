import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import {
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from './authApi.ts'
import type {
  AuthUser,
  LoginInput,
  RegistrationInput,
} from './authApi.ts'
import { AuthContext } from './authContext.ts'
import type { AuthContextValue } from './authContext.ts'
import { loadAuthSession } from './authSession.ts'
import { authReducer, initialAuthState } from './authState.ts'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState)

  const restoreSession = useCallback(async (signal?: AbortSignal) => {
    dispatch({ type: 'loading' })
    const action = await loadAuthSession(signal)

    if (action !== null) {
      dispatch(action)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void restoreSession(controller.signal)

    return () => controller.abort()
  }, [restoreSession])

  const login = useCallback(async (input: LoginInput): Promise<AuthUser> => {
    const user = await loginRequest(input)
    dispatch({ type: 'authenticated', user })
    return user
  }, [])

  const register = useCallback(
    (input: RegistrationInput): Promise<AuthUser> => registerRequest(input),
    [],
  )

  const logout = useCallback(async (): Promise<void> => {
    await logoutRequest()
    dispatch({ type: 'signedOut' })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    logout,
    refresh: restoreSession,
    register,
  }), [login, logout, register, restoreSession, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
