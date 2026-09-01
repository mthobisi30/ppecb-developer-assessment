import { ApiError } from '../../api/index.ts'
import type { ValidationProblemDetails } from '../../api/index.ts'
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './categoryTypes.ts'

export interface CategoryFormValues {
  name: string
  categoryCode: string
  isActive: boolean
}

export interface CategoryFieldErrors {
  name?: string
  categoryCode?: string
}

export interface CategoryFormFailure {
  fieldErrors: CategoryFieldErrors
  formError: string | null
}

export function getCategoryFormValues(category?: Category): CategoryFormValues {
  return category === undefined
    ? { name: '', categoryCode: '', isActive: true }
    : {
        name: category.name,
        categoryCode: category.categoryCode,
        isActive: category.isActive,
      }
}

export function validateCategoryForm(
  values: CategoryFormValues,
): CategoryFieldErrors {
  const errors: CategoryFieldErrors = {}

  if (values.name.length === 0) {
    errors.name = 'Enter a category name.'
  } else if (values.name.length > 200) {
    errors.name = 'Use 200 characters or fewer.'
  }

  if (values.categoryCode.length === 0) {
    errors.categoryCode = 'Enter a category code.'
  } else if (!/^[A-Z]{3}[0-9]{3}$/.test(values.categoryCode)) {
    errors.categoryCode = 'Use three uppercase letters followed by three digits.'
  }

  return errors
}

export function toCreateCategoryInput(
  values: CategoryFormValues,
): CreateCategoryInput {
  return { ...values }
}

export function toUpdateCategoryInput(
  values: CategoryFormValues,
  rowVersion: string,
): UpdateCategoryInput {
  return { ...values, rowVersion }
}

export function getCategoryFormFailure(error: unknown): CategoryFormFailure {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      formError: 'The category could not be saved. Please try again.',
    }
  }

  const problem = error.problem as Partial<ValidationProblemDetails>
  const fieldErrors: CategoryFieldErrors = {}

  if (problem.errors !== undefined) {
    fieldErrors.name = firstError(problem.errors, 'Name')
    fieldErrors.categoryCode = firstError(problem.errors, 'CategoryCode')
  }

  removeUndefinedFields(fieldErrors)

  if (error.status === 409
    && error.message.toLowerCase().includes('code already exists')
    && fieldErrors.categoryCode === undefined) {
    fieldErrors.categoryCode = 'A category with this code already exists.'
  }

  return Object.keys(fieldErrors).length > 0
    ? { fieldErrors, formError: null }
    : { fieldErrors, formError: error.message }
}

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((left, right) =>
    left.name.localeCompare(right.name)
      || left.categoryCode.localeCompare(right.categoryCode))
}

export function getCategoryActionError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'The category status could not be changed. Please try again.'
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

function removeUndefinedFields(errors: CategoryFieldErrors): void {
  for (const key of Object.keys(errors) as Array<keyof CategoryFieldErrors>) {
    if (errors[key] === undefined) {
      delete errors[key]
    }
  }
}
