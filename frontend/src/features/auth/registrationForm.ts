import { ApiError } from '../../api/index.ts'
import type { ValidationProblemDetails } from '../../api/index.ts'
import { getEmailError } from './formValidation.ts'

export interface RegistrationFormInput {
  confirmPassword: string
  email: string
  password: string
}

export interface RegistrationFieldErrors {
  confirmPassword?: string
  email?: string
  password?: string
}

export interface RegistrationFailure {
  fieldErrors: RegistrationFieldErrors
  formError: string | null
}

export function validateRegistrationInput(
  input: RegistrationFormInput,
): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {}
  const emailError = getEmailError(input.email)

  if (emailError !== undefined) {
    errors.email = emailError
  }

  if (input.password.length === 0) {
    errors.password = 'Enter a password.'
  } else if (!meetsPasswordRequirements(input.password)) {
    errors.password = 'Use at least 8 characters, including 4 unique characters, upper and lowercase letters, a number, and a symbol.'
  }

  if (input.confirmPassword.length === 0) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'The passwords do not match.'
  }

  return errors
}

export function getRegistrationFailure(error: unknown): RegistrationFailure {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      formError: 'Your account could not be created. Please try again.',
    }
  }

  const problem = error.problem as Partial<ValidationProblemDetails>
  const fieldErrors: RegistrationFieldErrors = {}

  if (problem.errors !== undefined) {
    const emailError = firstError(problem.errors, 'Email')
    const passwordError = firstError(problem.errors, 'Password')

    if (emailError !== undefined) {
      fieldErrors.email = emailError
    }

    if (passwordError !== undefined) {
      fieldErrors.password = passwordError
    }
  }

  if (error.status === 409 && fieldErrors.email === undefined) {
    fieldErrors.email = 'An account with this email address already exists.'
  }

  return Object.keys(fieldErrors).length > 0
    ? { fieldErrors, formError: null }
    : { fieldErrors, formError: error.message }
}

function meetsPasswordRequirements(password: string): boolean {
  return password.length >= 8
    && password.length <= 128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && /[^a-zA-Z0-9]/.test(password)
    && new Set(password).size >= 4
}

function firstError(
  errors: Record<string, string[]>,
  field: string,
): string | undefined {
  const key = Object.keys(errors).find(
    (candidate) => candidate.toLowerCase() === field.toLowerCase(),
  )

  return key === undefined ? undefined : errors[key]?.[0]
}
