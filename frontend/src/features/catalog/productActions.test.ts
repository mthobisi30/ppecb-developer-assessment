import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../api/index.ts'
import {
  getImageUploadFailure,
  getProductActionError,
  validateProductImage,
} from './productActions.ts'

test('validateProductImage accepts supported images within the size limit', () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'apples.webp', {
    type: 'image/webp',
  })

  assert.equal(validateProductImage(file), undefined)
})

test('validateProductImage rejects empty, oversized, and unsupported files', () => {
  const expected = 'Choose a JPG, PNG, WebP, GIF, or BMP image no larger than 5 MB.'
  const empty = new File([], 'empty.png', { type: 'image/png' })
  const oversized = new File(
    [new Uint8Array((5 * 1024 * 1024) + 1)],
    'large.jpg',
    { type: 'image/jpeg' },
  )
  const unsupported = new File(['content'], 'notes.txt', { type: 'text/plain' })

  assert.equal(validateProductImage(empty), expected)
  assert.equal(validateProductImage(oversized), expected)
  assert.equal(validateProductImage(unsupported), expected)
})

test('getImageUploadFailure maps file validation and general failures', () => {
  const validationError = new ApiError(400, {
    status: 400,
    title: 'Image validation failed.',
    errors: { File: ['The image content is invalid.'] },
  })
  const conflict = new ApiError(409, {
    status: 409,
    title: 'The product was changed by another request.',
  })

  assert.deepEqual(getImageUploadFailure(validationError), {
    fieldError: 'The image content is invalid.',
    formError: null,
  })
  assert.deepEqual(getImageUploadFailure(conflict), {
    fieldError: null,
    formError: 'The product was changed by another request.',
  })
})

test('getProductActionError preserves API errors and hides network details', () => {
  const missing = new ApiError(404, {
    status: 404,
    title: 'Product not found.',
  })

  assert.equal(getProductActionError(missing, 'Fallback'), 'Product not found.')
  assert.equal(
    getProductActionError(new TypeError('Network failure'), 'Delete failed.'),
    'Delete failed.',
  )
})
