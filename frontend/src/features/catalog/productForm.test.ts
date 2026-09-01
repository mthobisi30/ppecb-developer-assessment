import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../api/index.ts'
import {
  getProductFormFailure,
  getProductFormValues,
  toCreateProductInput,
  toUpdateProductInput,
  validateProductForm,
} from './productForm.ts'

test('validateProductForm reports incomplete and malformed values', () => {
  assert.deepEqual(validateProductForm({
    name: '',
    description: '',
    price: '',
    categoryId: '',
  }), {
    name: 'Enter a product name.',
    price: 'Enter a price.',
    categoryId: 'Select a category.',
  })

  assert.deepEqual(validateProductForm({
    name: 'Apples',
    description: '',
    price: '12.999',
    categoryId: '0',
  }), {
    price: 'Enter a non-negative price with no more than two decimal places.',
    categoryId: 'Select a category.',
  })
})

test('validateProductForm accepts complete product details', () => {
  assert.deepEqual(validateProductForm({
    name: 'Apples',
    description: 'Fresh apples',
    price: '29.95',
    categoryId: '4',
  }), {})
})

test('toCreateProductInput converts form values to an API request', () => {
  assert.deepEqual(toCreateProductInput({
    name: 'Apples',
    description: '',
    price: '29.95',
    categoryId: '4',
  }), {
    name: 'Apples',
    description: null,
    price: 29.95,
    categoryId: 4,
  })
})

test('product form helpers initialise and submit existing product details', () => {
  const product = {
    productId: 12,
    productCode: 'PROD-202609-001',
    name: 'Apples',
    description: null,
    price: 29.95,
    categoryId: 4,
    categoryName: 'Fruit',
    imagePath: null,
    rowVersion: 'AQIDBA==',
  }
  const values = getProductFormValues(product)

  assert.deepEqual(values, {
    name: 'Apples',
    description: '',
    price: '29.95',
    categoryId: '4',
  })
  assert.deepEqual(toUpdateProductInput(values, product.rowVersion), {
    name: 'Apples',
    description: null,
    price: 29.95,
    categoryId: 4,
    rowVersion: 'AQIDBA==',
  })
})

test('getProductFormFailure maps server validation errors to fields', () => {
  const error = new ApiError(400, {
    status: 400,
    title: 'Product validation failed.',
    errors: {
      Name: ['Name is required.'],
      CategoryId: ['Select an active category.'],
    },
  })

  assert.deepEqual(getProductFormFailure(error), {
    fieldErrors: {
      name: 'Name is required.',
      categoryId: 'Select an active category.',
    },
    formError: null,
  })
})

test('getProductFormFailure preserves general request failures', () => {
  const error = new ApiError(409, {
    status: 409,
    title: 'The monthly product-code limit has been reached.',
  })

  assert.deepEqual(getProductFormFailure(error), {
    fieldErrors: {},
    formError: 'The monthly product-code limit has been reached.',
  })
  assert.deepEqual(getProductFormFailure(new TypeError('Network failure')), {
    fieldErrors: {},
    formError: 'The product could not be saved. Please try again.',
  })
})
