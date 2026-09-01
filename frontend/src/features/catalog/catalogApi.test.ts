import assert from 'node:assert/strict'
import test from 'node:test'
import { resetCsrfToken } from '../../api/index.ts'
import {
  createProduct,
  getCategories,
  getProductPage,
  uploadProductImage,
} from './catalogApi.ts'

interface FetchCall {
  input: RequestInfo | URL
  init: RequestInit
}

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
  resetCsrfToken()
})

test('getProductPage requests and returns the selected page', async () => {
  const calls = installFetchResponses(jsonResponse({
    items: [{
      productId: 12,
      productCode: 'PROD-202609-001',
      name: 'Apples',
      description: 'Fresh apples',
      price: 29.95,
      categoryId: 4,
      categoryName: 'Fruit',
      imagePath: null,
      rowVersion: 'AQIDBA==',
    }],
    page: 2,
    pageSize: 10,
    totalCount: 11,
    totalPages: 2,
  }))

  const result = await getProductPage({ page: 2 })

  assert.equal(calls[0].input, '/api/products?page=2')
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(result.items[0].productCode, 'PROD-202609-001')
  assert.equal(result.items[0].price, 29.95)
  assert.equal(result.pageSize, 10)
  assert.equal(result.totalPages, 2)
})

test('getProductPage defaults to the first page and forwards cancellation', async () => {
  const calls = installFetchResponses(jsonResponse({
    items: [],
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  }))
  const controller = new AbortController()

  await getProductPage({ signal: controller.signal })

  assert.equal(calls[0].input, '/api/products?page=1')
  assert.equal(calls[0].init.signal, controller.signal)
})

test('getProductPage rejects invalid page numbers before requesting', () => {
  assert.throws(
    () => getProductPage({ page: 0 }),
    (error: unknown) => error instanceof RangeError
      && error.message === 'Page must be a positive integer.',
  )
})

test('getCategories returns category records', async () => {
  const calls = installFetchResponses(jsonResponse([{
    categoryId: 4,
    name: 'Fruit',
    categoryCode: 'FRT001',
    isActive: true,
    rowVersion: 'AQIDBA==',
  }]))

  const categories = await getCategories()

  assert.equal(calls[0].input, '/api/categories')
  assert.equal(categories[0].categoryCode, 'FRT001')
  assert.equal(categories[0].isActive, true)
})

test('createProduct submits product details and returns the created product', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({
      productId: 12,
      productCode: 'PROD-202609-001',
      name: 'Apples',
      description: 'Fresh apples',
      price: 29.95,
      categoryId: 4,
      categoryName: 'Fruit',
      imagePath: null,
      rowVersion: 'AQIDBA==',
    }, 201),
  )
  const controller = new AbortController()

  const product = await createProduct({
    name: 'Apples',
    description: 'Fresh apples',
    price: 29.95,
    categoryId: 4,
  }, controller.signal)

  assert.equal(calls[1].input, '/api/products')
  assert.equal(calls[1].init.method, 'POST')
  assert.equal(calls[1].init.signal, controller.signal)
  assert.equal(
    new Headers(calls[1].init.headers).get('X-CSRF-TOKEN'),
    'csrf-token',
  )
  assert.deepEqual(JSON.parse(calls[1].init.body as string), {
    name: 'Apples',
    description: 'Fresh apples',
    price: 29.95,
    categoryId: 4,
  })
  assert.equal(product.productCode, 'PROD-202609-001')
  assert.equal(product.categoryName, 'Fruit')
})

test('uploadProductImage submits multipart data and returns the updated product', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({
      productId: 12,
      productCode: 'PROD-202609-001',
      name: 'Apples',
      description: 'Fresh apples',
      price: 29.95,
      categoryId: 4,
      categoryName: 'Fruit',
      imagePath: '/uploads/products/apples.png',
      rowVersion: 'BQYHCA==',
    }),
  )
  const file = new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
    'apples.png',
    { type: 'image/png' },
  )
  const controller = new AbortController()

  const product = await uploadProductImage(12, file, controller.signal)

  assert.equal(calls[1].input, '/api/products/12/image')
  assert.equal(calls[1].init.method, 'POST')
  assert.equal(calls[1].init.signal, controller.signal)
  assert.equal(
    new Headers(calls[1].init.headers).get('X-CSRF-TOKEN'),
    'csrf-token',
  )
  assert.equal(new Headers(calls[1].init.headers).has('Content-Type'), false)
  assert.ok(calls[1].init.body instanceof FormData)
  assert.equal(calls[1].init.body.get('file'), file)
  assert.equal(product.imagePath, '/uploads/products/apples.png')
  assert.equal(product.rowVersion, 'BQYHCA==')
})

test('uploadProductImage rejects invalid product identifiers before requesting', () => {
  const file = new File([], 'apples.png', { type: 'image/png' })

  assert.throws(
    () => uploadProductImage(0, file),
    (error: unknown) => error instanceof RangeError
      && error.message === 'Product ID must be a positive integer.',
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
