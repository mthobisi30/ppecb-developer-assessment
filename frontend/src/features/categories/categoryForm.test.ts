import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../api/index.ts'
import {
  getCategoryFormFailure,
  getCategoryFormValues,
  getCategoryActionError,
  sortCategories,
  toCreateCategoryInput,
  toUpdateCategoryInput,
  validateCategoryForm,
} from './categoryForm.ts'

test('validateCategoryForm reports incomplete and malformed values', () => {
  assert.deepEqual(validateCategoryForm({
    name: '',
    categoryCode: '',
    isActive: true,
  }), {
    name: 'Enter a category name.',
    categoryCode: 'Enter a category code.',
  })

  assert.deepEqual(validateCategoryForm({
    name: 'Fruit',
    categoryCode: 'fruit1',
    isActive: true,
  }), {
    categoryCode: 'Use three uppercase letters followed by three digits.',
  })
})

test('category form helpers create and update API inputs', () => {
  const category = {
    categoryId: 4,
    name: 'Fruit',
    categoryCode: 'FRT001',
    isActive: true,
    rowVersion: 'AQIDBA==',
  }
  const values = getCategoryFormValues(category)

  assert.deepEqual(values, {
    name: 'Fruit',
    categoryCode: 'FRT001',
    isActive: true,
  })
  assert.deepEqual(toCreateCategoryInput(values), values)
  assert.deepEqual(toUpdateCategoryInput(values, category.rowVersion), {
    ...values,
    rowVersion: 'AQIDBA==',
  })
})

test('getCategoryFormFailure maps validation and duplicate-code failures', () => {
  const validation = new ApiError(400, {
    status: 400,
    title: 'Category validation failed.',
    errors: { Name: ['Name is required.'] },
  })
  const duplicate = new ApiError(409, {
    status: 409,
    title: 'A category with this code already exists.',
  })

  assert.deepEqual(getCategoryFormFailure(validation), {
    fieldErrors: { name: 'Name is required.' },
    formError: null,
  })
  assert.deepEqual(getCategoryFormFailure(duplicate), {
    fieldErrors: {
      categoryCode: 'A category with this code already exists.',
    },
    formError: null,
  })
})

test('getCategoryFormFailure preserves concurrency conflicts as form errors', () => {
  const conflict = new ApiError(409, {
    status: 409,
    title: 'The category was changed by another request. Reload it and try again.',
  })

  assert.deepEqual(getCategoryFormFailure(conflict), {
    fieldErrors: {},
    formError: 'The category was changed by another request. Reload it and try again.',
  })
})

test('sortCategories orders categories by name then code', () => {
  const categories = [
    { categoryId: 2, name: 'Vegetables', categoryCode: 'VEG001', isActive: true, rowVersion: 'Ag==' },
    { categoryId: 3, name: 'Fruit', categoryCode: 'FRT002', isActive: true, rowVersion: 'Aw==' },
    { categoryId: 1, name: 'Fruit', categoryCode: 'FRT001', isActive: true, rowVersion: 'AQ==' },
  ]

  assert.deepEqual(
    sortCategories(categories).map((category) => category.categoryId),
    [1, 3, 2],
  )
})

test('getCategoryActionError preserves API failures and hides network details', () => {
  const conflict = new ApiError(409, {
    status: 409,
    title: 'The category was changed by another request.',
  })

  assert.equal(
    getCategoryActionError(conflict),
    'The category was changed by another request.',
  )
  assert.equal(
    getCategoryActionError(new TypeError('Network failure')),
    'The category status could not be changed. Please try again.',
  )
})
