import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../api/index.ts'
import {
  catalogReducer,
  formatProductPrice,
  getCatalogErrorMessage,
  getProductRangeLabel,
  initialCatalogState,
} from './catalogState.ts'
import type { ProductPage } from './catalogTypes.ts'

const productPage: ProductPage = {
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
}

test('catalogReducer transitions through loading, success, and failure states', () => {
  const loading = catalogReducer(initialCatalogState, {
    type: 'pageRequested',
    page: 2,
  })
  const ready = catalogReducer(loading, {
    type: 'pageLoaded',
    page: 2,
    data: productPage,
  })
  const failed = catalogReducer(loading, {
    type: 'pageFailed',
    page: 2,
    message: 'Service unavailable.',
  })

  assert.deepEqual(loading, {
    data: null,
    error: null,
    page: 2,
    status: 'loading',
  })
  assert.deepEqual(ready, {
    data: productPage,
    error: null,
    page: 2,
    status: 'ready',
  })
  assert.deepEqual(failed, {
    data: null,
    error: 'Service unavailable.',
    page: 2,
    status: 'error',
  })
})

test('catalogReducer ignores a response for a page that is no longer selected', () => {
  const loading = catalogReducer(initialCatalogState, {
    type: 'pageRequested',
    page: 2,
  })

  const result = catalogReducer(loading, {
    type: 'pageLoaded',
    page: 1,
    data: { ...productPage, page: 1 },
  })

  assert.equal(result, loading)
})

test('getCatalogErrorMessage presents API and network failures safely', () => {
  const apiError = new ApiError(503, {
    status: 503,
    title: 'Service unavailable.',
  })

  assert.equal(getCatalogErrorMessage(apiError), 'Service unavailable.')
  assert.equal(
    getCatalogErrorMessage(new TypeError('Network failure')),
    'Products could not be loaded. Please try again.',
  )
})

test('catalog presentation helpers format prices and result ranges', () => {
  assert.match(formatProductPrice(29.95), /^R/)
  assert.equal(getProductRangeLabel(productPage), '11–11 of 11 products')
  assert.equal(getProductRangeLabel({
    ...productPage,
    items: [],
    page: 1,
    totalCount: 0,
    totalPages: 0,
  }), '0 products')
})
