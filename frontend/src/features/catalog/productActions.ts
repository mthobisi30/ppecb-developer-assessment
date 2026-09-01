import { ApiError } from '../../api/index.ts'
import type { ValidationProblemDetails } from '../../api/index.ts'

const maximumImageSize = 5 * 1024 * 1024
const acceptedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
])

export interface ImageUploadFailure {
  fieldError: string | null
  formError: string | null
}

export function validateProductImage(file: File): string | undefined {
  if (file.size === 0 || file.size > maximumImageSize
    || !acceptedImageTypes.has(file.type)) {
    return 'Choose a JPG, PNG, WebP, GIF, or BMP image no larger than 5 MB.'
  }

  return undefined
}

export function getImageUploadFailure(error: unknown): ImageUploadFailure {
  if (!(error instanceof ApiError)) {
    return {
      fieldError: null,
      formError: 'The product image could not be uploaded. Please try again.',
    }
  }

  const problem = error.problem as Partial<ValidationProblemDetails>
  const fieldError = problem.errors === undefined
    ? undefined
    : firstError(problem.errors, 'File')

  return fieldError === undefined
    ? { fieldError: null, formError: error.message }
    : { fieldError, formError: null }
}

export function getProductActionError(
  error: unknown,
  fallback: string,
): string {
  return error instanceof ApiError ? error.message : fallback
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
