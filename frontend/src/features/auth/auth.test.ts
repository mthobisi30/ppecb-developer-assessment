import assert from 'node:assert/strict'
import test from 'node:test'
import { resetCsrfToken } from '../../api/index.ts'
import {
  getCurrentUser,
  login,
  logout,
  register,
} from './authApi.ts'
import { loadAuthSession } from './authSession.ts'
import { authReducer, initialAuthState } from './authState.ts'

interface FetchCall {
  input: RequestInfo | URL
  init: RequestInit
}

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
  resetCsrfToken()
})

test('getCurrentUser requests the authenticated session', async () => {
  const calls = installFetchResponses(
    jsonResponse({ userId: 'user-id', email: 'person@example.com' }),
  )

  const user = await getCurrentUser()

  assert.equal(user.userId, 'user-id')
  assert.equal(calls[0].input, '/api/auth/me')
  assert.equal(calls[0].init.method, 'GET')
})

test('login submits credentials and returns the authenticated user', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({ userId: 'user-id', email: 'person@example.com' }),
  )

  const user = await login({
    email: 'person@example.com',
    password: 'ValidPassword1!',
  })

  assert.equal(user.email, 'person@example.com')
  assert.equal(calls[1].input, '/api/auth/login')
  assert.deepEqual(JSON.parse(calls[1].init.body as string), {
    email: 'person@example.com',
    password: 'ValidPassword1!',
  })
})

test('register creates an account without changing session state', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({ userId: 'user-id', email: 'person@example.com' }),
  )

  const user = await register({
    email: 'person@example.com',
    password: 'ValidPassword1!',
  })

  assert.equal(user.userId, 'user-id')
  assert.equal(calls[1].input, '/api/auth/register')
})

test('logout submits a protected request', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    new Response(null, { status: 204 }),
  )

  await logout()

  assert.equal(calls[1].input, '/api/auth/logout')
  assert.equal(calls[1].init.method, 'POST')
  assert.equal(new Headers(calls[1].init.headers).get('X-CSRF-TOKEN'), 'csrf-token')
})

test('loadAuthSession treats an unauthorized response as signed out', async () => {
  installFetchResponses(
    jsonResponse({ status: 401, title: 'Authentication is required.' }, 401),
  )

  const action = await loadAuthSession()

  assert.deepEqual(action, { type: 'signedOut' })
})

test('loadAuthSession preserves session restoration failures', async () => {
  installFetchResponses(
    jsonResponse({ status: 503, title: 'Service unavailable.' }, 503),
  )

  const action = await loadAuthSession()

  assert.deepEqual(action, {
    type: 'error',
    message: 'Service unavailable.',
  })
})

test('authReducer transitions between session states', () => {
  const user = { userId: 'user-id', email: 'person@example.com' }
  const authenticated = authReducer(initialAuthState, {
    type: 'authenticated',
    user,
  })
  const signedOut = authReducer(authenticated, { type: 'signedOut' })
  const failed = authReducer(initialAuthState, {
    type: 'error',
    message: 'API unavailable.',
  })

  assert.deepEqual(authenticated, {
    status: 'authenticated',
    user,
    error: null,
  })
  assert.deepEqual(signedOut, {
    status: 'signedOut',
    user: null,
    error: null,
  })
  assert.deepEqual(failed, {
    status: 'error',
    user: null,
    error: 'API unavailable.',
  })
})

function installFetchResponses(...responses: Response[]): FetchCall[] {
  const calls: FetchCall[] = []

  globalThis.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ input, init })
    const response = responses.shift()

    if (response === undefined) {
      throw new Error('No mock response configured.')
    }

    return response
  }

  return calls
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
