import { useState } from 'react'
import type { FormEvent } from 'react'
import { LockIcon, UserIcon } from './AuthIcons.tsx'
import type { LoginInput } from './authApi.ts'
import {
  getLoginErrorMessage,
  validateLoginInput,
} from './loginForm.ts'
import { useAuth } from './useAuth.ts'

interface LoginPageProps {
  initialEmail?: string
  notice?: string | null
  onCreateAccount?: () => void
}

export function LoginPage({
  initialEmail = '',
  notice = null,
  onCreateAccount,
}: LoginPageProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState(initialEmail)
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
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-heading">
        <h1 id="login-heading">Sign In</h1>
        <p className="auth-description">Sign in to access your products.</p>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          {notice !== null && (
            <p className="alert alert-success" role="status">{notice}</p>
          )}
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

        {onCreateAccount !== undefined && (
          <p className="auth-switch">
            Don&apos;t have an account?
            <button className="text-button" onClick={onCreateAccount} type="button">
              Create account
            </button>
          </p>
        )}
      </section>
    </main>
  )
}
