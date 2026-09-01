import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, resetCsrfToken } from '../../api/index.ts'
import {
  createProduct,
  deleteProduct,
  exportProductsToSpreadsheet,
  getProductPage,
  importProductsFromSpreadsheet,
  updateProduct,
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

test('updateProduct submits the concurrency version and returns the updated product', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({
      productId: 12,
      productCode: 'PROD-202609-001',
      name: 'Green apples',
      description: null,
      price: 34.5,
      categoryId: 4,
      categoryName: 'Fruit',
      imagePath: null,
      rowVersion: 'BQYHCA==',
    }),
  )
  const controller = new AbortController()

  const product = await updateProduct(12, {
    name: 'Green apples',
    description: null,
    price: 34.5,
    categoryId: 4,
    rowVersion: 'AQIDBA==',
  }, controller.signal)

  assert.equal(calls[1].input, '/api/products/12')
  assert.equal(calls[1].init.method, 'PUT')
  assert.equal(calls[1].init.signal, controller.signal)
  assert.deepEqual(JSON.parse(calls[1].init.body as string), {
    name: 'Green apples',
    description: null,
    price: 34.5,
    categoryId: 4,
    rowVersion: 'AQIDBA==',
  })
  assert.equal(product.name, 'Green apples')
  assert.equal(product.rowVersion, 'BQYHCA==')
})

test('deleteProduct submits an authenticated delete request', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    new Response(null, { status: 204 }),
  )
  const controller = new AbortController()

  await deleteProduct(12, controller.signal)

  assert.equal(calls[1].input, '/api/products/12')
  assert.equal(calls[1].init.method, 'DELETE')
  assert.equal(calls[1].init.signal, controller.signal)
  assert.equal(
    new Headers(calls[1].init.headers).get('X-CSRF-TOKEN'),
    'csrf-token',
  )
})

test('importProductsFromSpreadsheet submits multipart data and returns the import count', async () => {
  const calls = installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({ importedCount: 8 }),
  )
  const file = new File(['workbook'], 'products.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const controller = new AbortController()

  const result = await importProductsFromSpreadsheet(file, controller.signal)

  assert.equal(calls[1].input, '/api/products/import')
  assert.equal(calls[1].init.method, 'POST')
  assert.equal(calls[1].init.signal, controller.signal)
  assert.equal(new Headers(calls[1].init.headers).has('Content-Type'), false)
  assert.ok(calls[1].init.body instanceof FormData)
  assert.equal(calls[1].init.body.get('file'), file)
  assert.equal(result.importedCount, 8)
})

test('importProductsFromSpreadsheet preserves row validation errors', async () => {
  installFetchResponses(
    jsonResponse({ token: 'csrf-token' }),
    jsonResponse({
      status: 400,
      title: 'Product import validation failed.',
      errors: {
        'Rows[2].CategoryCode': ['The category code was not found.'],
      },
    }, 400),
  )
  const file = new File(['workbook'], 'products.xlsx')

  await assert.rejects(
    importProductsFromSpreadsheet(file),
    (error: unknown) => error instanceof ApiError
      && error.status === 400
      && error.problem.errors !== undefined,
  )
})

test('exportProductsToSpreadsheet downloads the generated workbook', async () => {
  const calls = installFetchResponses(new Response(
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    },
  ))
  const controller = new AbortController()

  const workbook = await exportProductsToSpreadsheet(controller.signal)

  assert.equal(calls[0].input, '/api/products/export')
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(calls[0].init.signal, controller.signal)
  assert.equal(workbook.size, 4)
  assert.equal(
    workbook.type,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
