import { useState } from 'react'
import type { FormEvent } from 'react'
import type { LoginInput } from './authApi.ts'
import {
  getLoginErrorMessage,
  validateLoginInput,
} from './loginForm.ts'
import { useAuth } from './useAuth.ts'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState(() => validateLoginInput({
    email: '',
    password: '',
  }, false))
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: LoginInput = { email: email.trim(), password }
    const errors = validateLoginInput(input)

    setFieldErrors(errors)
    setSubmitError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      await login(input)
    } catch (error) {
      setSubmitError(getLoginErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <h1 id="login-heading">Sign In</h1>
        <p className="login-description">Sign in to access your products.</p>

        <form className="login-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          {submitError !== null && (
            <p className="alert alert-error" role="alert">{submitError}</p>
          )}

          <div className="field">
            <label htmlFor="email">Email:</label>
            <div className="input-control">
              <UserIcon />
              <input
                aria-describedby={fieldErrors.email === undefined ? undefined : 'email-error'}
                aria-invalid={fieldErrors.email !== undefined}
                autoComplete="email"
                id="email"
                inputMode="email"
                maxLength={256}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email"
                type="email"
                value={email}
              />
            </div>
            {fieldErrors.email !== undefined && (
              <span className="field-error" id="email-error">{fieldErrors.email}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password:</label>
            <div className="input-control">
              <LockIcon />
              <input
                aria-describedby={fieldErrors.password === undefined ? undefined : 'password-error'}
                aria-invalid={fieldErrors.password !== undefined}
                autoComplete="current-password"
                id="password"
                maxLength={128}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
            </div>
            {fieldErrors.password !== undefined && (
              <span className="field-error" id="password-error">{fieldErrors.password}</span>
            )}
          </div>

          <label className="checkbox-field">
            <input
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              type="checkbox"
            />
            Show password
          </label>

          <button
            className="button button-primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

function UserIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.7-4.1 3.2-6.2 7.5-6.2s6.8 2.1 7.5 6.2" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="10" width="15" height="11" rx="1" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
