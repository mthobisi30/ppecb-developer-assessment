import { useState } from 'react'
import {
  LoaderCircle,
  LogIn,
  UserPlus,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { IconButton } from '../../components/IconButton.tsx'
import { LockIcon, UserIcon } from './AuthIcons.tsx'
import {
  getRegistrationFailure,
  validateRegistrationInput,
} from './registrationForm.ts'
import type { RegistrationFieldErrors } from './registrationForm.ts'
import { useAuth } from './useAuth.ts'

interface RegistrationPageProps {
  onCancel: () => void
  onRegistered: (email: string) => void
}

export function RegistrationPage({
  onCancel,
  onRegistered,
}: RegistrationPageProps) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = {
      confirmPassword,
      email: email.trim(),
      password,
    }
    const errors = validateRegistrationInput(input)

    setFieldErrors(errors)
    setSubmitError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const user = await register({ email: input.email, password })
      onRegistered(user.email)
    } catch (error) {
      const failure = getRegistrationFailure(error)
      setFieldErrors(failure.fieldErrors)
      setSubmitError(failure.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page registration-page">
      <section className="auth-card registration-card" aria-labelledby="registration-heading">
        <h1 id="registration-heading">Create Account</h1>
        <p className="auth-description">Create an account to manage your products.</p>

        <form
          className="auth-form registration-form"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          {submitError !== null && (
            <p className="alert alert-error" role="alert">{submitError}</p>
          )}

          <div className="field">
            <label htmlFor="registration-email">Email:</label>
            <div className="input-control">
              <UserIcon />
              <input
                aria-describedby={fieldErrors.email === undefined ? undefined : 'registration-email-error'}
                aria-invalid={fieldErrors.email !== undefined}
                autoComplete="email"
                id="registration-email"
                inputMode="email"
                maxLength={256}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email"
                type="email"
                value={email}
              />
            </div>
            {fieldErrors.email !== undefined && (
              <span className="field-error" id="registration-email-error">{fieldErrors.email}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="registration-password">Password:</label>
            <div className="input-control">
              <LockIcon />
              <input
                aria-describedby={fieldErrors.password === undefined
                  ? 'password-requirements'
                  : 'password-requirements registration-password-error'}
                aria-invalid={fieldErrors.password !== undefined}
                autoComplete="new-password"
                id="registration-password"
                maxLength={128}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
            </div>
            <span className="field-help" id="password-requirements">
              At least 8 characters, including 4 unique characters, upper and lowercase letters, a number, and a symbol.
            </span>
            {fieldErrors.password !== undefined && (
              <span className="field-error" id="registration-password-error">{fieldErrors.password}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="confirm-password">Confirm password:</label>
            <div className="input-control">
              <LockIcon />
              <input
                aria-describedby={fieldErrors.confirmPassword === undefined
                  ? undefined
                  : 'confirm-password-error'}
                aria-invalid={fieldErrors.confirmPassword !== undefined}
                autoComplete="new-password"
                id="confirm-password"
                maxLength={128}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
              />
            </div>
            {fieldErrors.confirmPassword !== undefined && (
              <span className="field-error" id="confirm-password-error">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          <label className="checkbox-field">
            <input
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              type="checkbox"
            />
            Show passwords
          </label>

          <IconButton
            disabled={isSubmitting}
            icon={isSubmitting
              ? <LoaderCircle aria-hidden="true" className="icon-spin" size={18} strokeWidth={1.8} />
              : <UserPlus aria-hidden="true" size={18} strokeWidth={1.8} />}
            label={isSubmitting ? 'Creating account' : 'Create account'}
            type="submit"
            variant="primary"
          />
        </form>

        <p className="auth-switch">
          Already have an account?
          <IconButton
            icon={<LogIn aria-hidden="true" size={18} strokeWidth={1.8} />}
            label="Sign in"
            onClick={onCancel}
            type="button"
            variant="quiet"
          />
        </p>
      </section>
    </main>
  )
}
