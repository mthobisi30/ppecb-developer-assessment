import { useState } from 'react'
import { LoginPage } from './LoginPage.tsx'
import { RegistrationPage } from './RegistrationPage.tsx'

type AuthenticationView = 'login' | 'registration'

export function AuthenticationPage() {
  const [view, setView] = useState<AuthenticationView>('login')
  const [registeredEmail, setRegisteredEmail] = useState('')

  if (view === 'registration') {
    return (
      <RegistrationPage
        onCancel={() => setView('login')}
        onRegistered={(email) => {
          setRegisteredEmail(email)
          setView('login')
        }}
      />
    )
  }

  return (
    <LoginPage
      initialEmail={registeredEmail}
      notice={registeredEmail.length > 0
        ? 'Your account has been created. You can now sign in.'
        : null}
      onCreateAccount={() => {
        setRegisteredEmail('')
        setView('registration')
      }}
    />
  )
}
