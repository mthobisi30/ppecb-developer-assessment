import { useContext } from 'react'
import { AuthContext } from './authContext.ts'
import type { AuthContextValue } from './authContext.ts'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}
