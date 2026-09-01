import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../api/index.ts'
import {
  getSpreadsheetExportError,
  getSpreadsheetImportFailure,
  validateProductSpreadsheet,
} from './spreadsheetExchange.ts'

test('validateProductSpreadsheet accepts a non-empty xlsx workbook', () => {
  const file = new File(['workbook'], 'PRODUCTS.XLSX')

  assert.equal(validateProductSpreadsheet(file), undefined)
})

test('validateProductSpreadsheet rejects invalid workbook selections', () => {
  assert.equal(
    validateProductSpreadsheet(new File([], 'products.xlsx')),
    'Choose a valid .xlsx file no larger than 10 MB.',
  )
  assert.equal(
    validateProductSpreadsheet(new File(['products'], 'products.csv')),
    'Choose a valid .xlsx file no larger than 10 MB.',
  )
  assert.equal(
    validateProductSpreadsheet(new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'products.xlsx',
    )),
    'Choose a valid .xlsx file no larger than 10 MB.',
  )
})

test('getSpreadsheetImportFailure separates file and row validation errors', () => {
  const failure = getSpreadsheetImportFailure(new ApiError(400, {
    title: 'Product import validation failed.',
    errors: {
      File: ['The workbook is empty.'],
      'Rows[2].CategoryCode': ['The category code was not found.'],
      'Rows[3].Price': ['The price must be greater than zero.'],
    },
  }))

  assert.equal(failure.fileError, 'The workbook is empty.')
  assert.equal(failure.formError, null)
  assert.deepEqual(failure.rowErrors, [
    {
      rowNumber: 2,
      field: 'CategoryCode',
      message: 'The category code was not found.',
    },
    {
      rowNumber: 3,
      field: 'Price',
      message: 'The price must be greater than zero.',
    },
  ])
})

test('getSpreadsheetImportFailure keeps conflict row errors actionable', () => {
  const failure = getSpreadsheetImportFailure(new ApiError(409, {
    title: 'Product import validation failed.',
    errors: {
      'Rows[4].Name': ['A product with this name already exists.'],
    },
  }))

  assert.equal(failure.formError, null)
  assert.equal(failure.rowErrors[0].rowNumber, 4)
  assert.equal(failure.rowErrors[0].field, 'Name')
})

test('spreadsheet failures use clear fallbacks for unexpected errors', () => {
  assert.deepEqual(getSpreadsheetImportFailure(new Error('Network error')), {
    fileError: null,
    formError: 'The spreadsheet could not be imported. Please try again.',
    rowErrors: [],
  })
  assert.equal(
    getSpreadsheetExportError(new Error('Network error')),
    'The product spreadsheet could not be exported. Please try again.',
  )
})
