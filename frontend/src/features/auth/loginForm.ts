import { ApiError } from '../../api/index.ts'
import type { LoginInput } from './authApi.ts'
import { getEmailError } from './formValidation.ts'

export interface LoginFieldErrors {
  email?: string
  password?: string
}

export function validateLoginInput(
  input: LoginInput,
  showRequiredErrors = true,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {}
  const emailError = getEmailError(input.email, showRequiredErrors)

  if (emailError !== undefined) {
    errors.email = emailError
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
