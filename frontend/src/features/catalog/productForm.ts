import { ApiError } from '../../api/index.ts'
import type { ValidationProblemDetails } from '../../api/index.ts'
import type { CreateProductInput } from './catalogTypes.ts'

export interface ProductFormValues {
  name: string
  description: string
  price: string
  categoryId: string
}

export interface ProductFieldErrors {
  name?: string
  description?: string
  price?: string
  categoryId?: string
}

export interface ProductFormFailure {
  fieldErrors: ProductFieldErrors
  formError: string | null
}

export function validateProductForm(
  values: ProductFormValues,
): ProductFieldErrors {
  const errors: ProductFieldErrors = {}

  if (values.name.length === 0) {
    errors.name = 'Enter a product name.'
  } else if (values.name.length > 200) {
    errors.name = 'Use 200 characters or fewer.'
  }

  if (values.description.length > 2000) {
    errors.description = 'Use 2,000 characters or fewer.'
  }

  if (values.price.length === 0) {
    errors.price = 'Enter a price.'
  } else if (!/^\d+(\.\d{1,2})?$/.test(values.price)) {
    errors.price = 'Enter a non-negative price with no more than two decimal places.'
  }

  if (!/^\d+$/.test(values.categoryId) || Number(values.categoryId) < 1) {
    errors.categoryId = 'Select a category.'
  }

  return errors
}

export function toCreateProductInput(
  values: ProductFormValues,
): CreateProductInput {
  return {
    name: values.name,
    description: values.description.length === 0 ? null : values.description,
    price: Number(values.price),
    categoryId: Number(values.categoryId),
  }
}

export function getProductFormFailure(error: unknown): ProductFormFailure {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      formError: 'The product could not be added. Please try again.',
    }
  }

  const problem = error.problem as Partial<ValidationProblemDetails>
  const fieldErrors: ProductFieldErrors = {}

  if (problem.errors !== undefined) {
    fieldErrors.name = firstError(problem.errors, 'Name')
    fieldErrors.description = firstError(problem.errors, 'Description')
    fieldErrors.price = firstError(problem.errors, 'Price')
    fieldErrors.categoryId = firstError(problem.errors, 'CategoryId')
  }

  removeUndefinedFields(fieldErrors)

  return Object.keys(fieldErrors).length > 0
    ? { fieldErrors, formError: null }
    : { fieldErrors, formError: error.message }
}

function firstError(
  errors: Record<string, string[]>,
  field: string,
): string | undefined {
  const key = Object.keys(errors).find(
    (candidate) => candidate.toLowerCase() === field.toLowerCase(),
  )

  return key === undefined ? undefined : errors[key]?.[0]
}

function removeUndefinedFields(errors: ProductFieldErrors): void {
  for (const key of Object.keys(errors) as Array<keyof ProductFieldErrors>) {
    if (errors[key] === undefined) {
      delete errors[key]
    }
  }
}
