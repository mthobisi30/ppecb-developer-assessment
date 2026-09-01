export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  [extension: string]: unknown
}

export interface ValidationProblemDetails extends ProblemDetails {
  errors: Record<string, string[]>
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface CsrfTokenResponse {
  token: string
}

export interface CurrentUserResponse {
  userId: string
  email: string
}
