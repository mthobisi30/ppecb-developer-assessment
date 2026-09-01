import type { CsrfTokenResponse, ProblemDetails } from './types.ts'

const apiBasePath = '/api'
const csrfHeaderName = 'X-CSRF-TOKEN'
const authenticationChangePaths = new Set(['/auth/login', '/auth/logout'])

let csrfToken: string | null = null
let csrfTokenRequest: Promise<string> | null = null

export interface ApiRequestOptions
  extends Omit<RequestInit, 'body' | 'headers'> {
  body?: BodyInit | null
  headers?: HeadersInit
  json?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails

  constructor(status: number, problem: ProblemDetails) {
    super(problem.title ?? `Request failed with status ${status}.`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await sendRequest(path, options)

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function apiDownload(
  path: string,
  options: ApiRequestOptions = {},
): Promise<Blob> {
  const response = await sendRequest(path, options)
  return response.blob()
}

export function resetCsrfToken(): void {
  csrfToken = null
  csrfTokenRequest = null
}

async function sendRequest(
  path: string,
  options: ApiRequestOptions,
  allowAntiforgeryRetry = true,
): Promise<Response> {
  const {
    body: providedBody,
    headers: providedHeaders,
    json,
    ...requestInit
  } = options
  const normalizedPath = normalizePath(path)
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(providedHeaders)
  let body = providedBody

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (json !== undefined) {
    if (body !== undefined) {
      throw new Error('Provide either json or body, not both.')
    }

    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(json)
  }

  if (isUnsafeMethod(method)) {
    headers.set(csrfHeaderName, await getCsrfToken())
  }

  const response = await fetch(`${apiBasePath}${normalizedPath}`, {
    ...requestInit,
    method,
    headers,
    body,
    credentials: 'include',
  })

  if (!response.ok) {
    const problem = await readProblemDetails(response.clone())

    if (allowAntiforgeryRetry && isAntiforgeryFailure(response.status, problem)) {
      resetCsrfToken()
      return sendRequest(path, options, false)
    }

    throw new ApiError(response.status, problem)
  }

  if (authenticationChangePaths.has(normalizedPath)) {
    resetCsrfToken()
  }

  return response
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken !== null) {
    return csrfToken
  }

  csrfTokenRequest ??= apiRequest<CsrfTokenResponse>('/auth/csrf')
    .then((response) => response.token)
    .finally(() => {
      csrfTokenRequest = null
    })

  csrfToken = await csrfTokenRequest
  return csrfToken
}

async function readProblemDetails(response: Response): Promise<ProblemDetails> {
  try {
    const value: unknown = await response.json()

    if (isRecord(value)) {
      return value as ProblemDetails
    }
  } catch {
    return defaultProblem(response.status)
  }

  return defaultProblem(response.status)
}

function defaultProblem(status: number): ProblemDetails {
  return {
    status,
    title: `Request failed with status ${status}.`,
  }
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

function isUnsafeMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)
}

function isAntiforgeryFailure(status: number, problem: ProblemDetails): boolean {
  return status === 400
    && typeof problem.title === 'string'
    && problem.title.toLowerCase().includes('anti-forgery')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
