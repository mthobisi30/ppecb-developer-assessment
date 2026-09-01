import assert from 'node:assert/strict'
import test from 'node:test'
import { resetCsrfToken } from '../../api/index.ts'
import {
  createCategory,
  getCategories,
  updateCategory,
} from './categoryApi.ts'

interface FetchCall {
  input: RequestInfo | URL
  init: RequestInit
}

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
  resetCsrfToken()
})

test('getCategories returns the current users categories', async () => {
  const calls = installFetchResponses(jsonResponse([{
    categoryId: 4,
    name: 'Fruit',
    categoryCode: 'FRT001',
    isActive: true,
    rowVersion: 'AQIDBA==',
  }]))

  const categories = await getCategories()

  assert.equal(calls[0].input, '/api/categories')
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(categories[0].categoryCode, 'FRT001')
})

test('createCategory submits category details and returns the created category', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({
      categoryId: 4,
      name: 'Fruit',
      categoryCode: 'FRT001',
      isActive: true,
      rowVersion: 'AQIDBA==',
    }, 201),
  )

  const category = await createCategory({
    name: 'Fruit',
    categoryCode: 'FRT001',
    isActive: true,
  })

  assert.equal(calls[1].input, '/api/categories')
  assert.equal(calls[1].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[1].init.body as string), {
    name: 'Fruit',
    categoryCode: 'FRT001',
    isActive: true,
  })
  assert.equal(category.categoryId, 4)
})

test('updateCategory submits status and concurrency details', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({
      categoryId: 4,
      name: 'Fresh fruit',
      categoryCode: 'FRT001',
      isActive: false,
      rowVersion: 'BQYHCA==',
    }),
  )
  const controller = new AbortController()

  const category = await updateCategory(4, {
    name: 'Fresh fruit',
    categoryCode: 'FRT001',
    isActive: false,
    rowVersion: 'AQIDBA==',
  }, controller.signal)

  assert.equal(calls[1].input, '/api/categories/4')
  assert.equal(calls[1].init.method, 'PUT')
  assert.equal(calls[1].init.signal, controller.signal)
  assert.deepEqual(JSON.parse(calls[1].init.body as string), {
    name: 'Fresh fruit',
    categoryCode: 'FRT001',
    isActive: false,
    rowVersion: 'AQIDBA==',
  })
  assert.equal(category.isActive, false)
  assert.equal(category.rowVersion, 'BQYHCA==')
})

test('updateCategory rejects invalid identifiers before requesting', () => {
  assert.throws(
    () => updateCategory(0, {
      name: 'Fruit',
      categoryCode: 'FRT001',
      isActive: true,
      rowVersion: 'AQIDBA==',
    }),
    (error: unknown) => error instanceof RangeError
      && error.message === 'Category ID must be a positive integer.',
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
