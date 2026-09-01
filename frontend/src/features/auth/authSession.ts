import { ApiError } from '../../api/index.ts'
import { getCurrentUser } from './authApi.ts'
import type { AuthAction } from './authState.ts'

export async function loadAuthSession(
  signal?: AbortSignal,
): Promise<AuthAction | null> {
  try {
    const user = await getCurrentUser(signal)
    return { type: 'authenticated', user }
  } catch (error: unknown) {
    if (signal?.aborted) {
      return null
    }

    if (error instanceof ApiError && error.status === 401) {
      return { type: 'signedOut' }
    }

    return {
      type: 'error',
      message: error instanceof Error
        ? error.message
        : 'Unable to restore the session.',
    }
  }
}
