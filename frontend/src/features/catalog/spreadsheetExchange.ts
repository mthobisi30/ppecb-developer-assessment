import { ApiError } from '../../api/index.ts'
import type { ValidationProblemDetails } from '../../api/index.ts'

const maximumSpreadsheetSize = 10 * 1024 * 1024
const rowErrorPattern = /^Rows\[(\d+)]\.(.+)$/

export interface SpreadsheetRowError {
  rowNumber: number
  field: string
  message: string
}

export interface SpreadsheetImportFailure {
  fileError: string | null
  formError: string | null
  rowErrors: SpreadsheetRowError[]
}

export function validateProductSpreadsheet(file: File): string | undefined {
  if (file.size === 0 || file.size > maximumSpreadsheetSize
    || !file.name.toLowerCase().endsWith('.xlsx')) {
    return 'Choose a valid .xlsx file no larger than 10 MB.'
  }

  return undefined
}

export function getSpreadsheetImportFailure(
  error: unknown,
): SpreadsheetImportFailure {
  if (!(error instanceof ApiError)) {
    return {
      fileError: null,
      formError: 'The spreadsheet could not be imported. Please try again.',
      rowErrors: [],
    }
  }

  const problem = error.problem as Partial<ValidationProblemDetails>
  const errors = problem.errors ?? {}
  const fileError = getFirstError(errors, 'File') ?? null
  const rowErrors = Object.entries(errors).flatMap(([key, messages]) => {
    const match = rowErrorPattern.exec(key)

    if (match === null) {
      return []
    }

    return messages.map((message) => ({
      rowNumber: Number(match[1]),
      field: match[2],
      message,
    }))
  })

  return {
    fileError,
    formError: fileError === null && rowErrors.length === 0
      ? error.message
      : null,
    rowErrors,
  }
}

export function getSpreadsheetExportError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'The product spreadsheet could not be exported. Please try again.'
}

function getFirstError(
  errors: Record<string, string[]>,
  field: string,
): string | undefined {
  const key = Object.keys(errors).find(
    (candidate) => candidate.toLowerCase() === field.toLowerCase(),
  )

  return key === undefined ? undefined : errors[key]?.[0]
}
