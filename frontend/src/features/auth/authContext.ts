import { createContext } from 'react'
import type {
  AuthUser,
  LoginInput,
  RegistrationInput,
} from './authApi.ts'
import type { AuthState } from './authState.ts'

export interface AuthContextValue extends AuthState {
  login: (input: LoginInput) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  register: (input: RegistrationInput) => Promise<AuthUser>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
