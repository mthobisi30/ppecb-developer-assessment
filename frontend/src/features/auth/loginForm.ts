import { ApiError } from '../../api/index.ts'
import type { LoginInput } from './authApi.ts'

export interface LoginFieldErrors {
  email?: string
  password?: string
}

export function validateLoginInput(
  input: LoginInput,
  showRequiredErrors = true,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {}
  const email = input.email.trim()

  if (email.length === 0) {
    if (showRequiredErrors) {
      errors.email = 'Enter your email address.'
    }
  } else if (!isEmailAddress(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (input.password.length === 0 && showRequiredErrors) {
    errors.password = 'Enter your password.'
  }

  return errors
}

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'The email address or password is incorrect.'
    }

    return error.message
  }

  return 'Sign in could not be completed. Please try again.'
}

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
