import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ApiError,
  apiRequest,
  resetCsrfToken,
} from './apiClient.ts'

interface FetchCall {
  input: RequestInfo | URL
  init: RequestInit
}

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
  resetCsrfToken()
})

test('apiRequest sends cookies with read requests', async () => {
  const calls = installFetchResponses(jsonResponse({ userId: '1', email: 'person@example.com' }))

  await apiRequest('/auth/me')

  assert.equal(calls.length, 1)
  assert.equal(calls[0].input, '/api/auth/me')
  assert.equal(calls[0].init.credentials, 'include')
  assert.equal(calls[0].init.method, 'GET')
})

test('apiRequest obtains and attaches a CSRF token to mutations', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({ categoryId: 1 }),
  )

  await apiRequest('/categories', {
    method: 'POST',
    json: { name: 'Fruit', categoryCode: 'FRT001' },
  })

  assert.equal(calls.length, 2)
  assert.equal(calls[0].input, '/api/auth/csrf')
  assert.equal(calls[1].input, '/api/categories')
  assert.equal(new Headers(calls[1].init.headers).get('X-CSRF-TOKEN'), 'csrf-token')
  assert.equal(new Headers(calls[1].init.headers).get('Content-Type'), 'application/json')
})

test('apiRequest refreshes a rejected CSRF token once', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'expired-token' }),
    jsonResponse(
      { status: 400, title: 'The anti-forgery token is invalid or missing.' },
      400,
    ),
    jsonResponse({ token: 'fresh-token' }),
    jsonResponse({ categoryId: 1 }),
  )

  await apiRequest('/categories', {
    method: 'POST',
    json: { name: 'Fruit', categoryCode: 'FRT001' },
  })

  assert.equal(calls.length, 4)
  assert.equal(new Headers(calls[3].init.headers).get('X-CSRF-TOKEN'), 'fresh-token')
})

test('apiRequest throws ApiError with ProblemDetails', async () => {
  installFetchResponses(
    jsonResponse({ status: 404, title: 'Product not found.' }, 404),
  )

  await assert.rejects(
    apiRequest('/products/99'),
    (error: unknown) => error instanceof ApiError
      && error.status === 404
      && error.problem.title === 'Product not found.',
  )
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
