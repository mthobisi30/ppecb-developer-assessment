import { apiRequest } from '../../api/index.ts'
import type { CurrentUserResponse } from '../../api/index.ts'

export interface LoginInput {
  email: string
  password: string
}

export interface RegistrationInput {
  email: string
  password: string
}

export type AuthUser = CurrentUserResponse

export function getCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', { signal })
}

export function login(input: LoginInput): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/login', {
    method: 'POST',
    json: input,
  })
}

export function register(input: RegistrationInput): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/register', {
    method: 'POST',
    json: input,
  })
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}
