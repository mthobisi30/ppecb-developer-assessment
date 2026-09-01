import { apiRequest } from '../../api/index.ts'
import type { Category, ProductPage } from './catalogTypes.ts'

export interface ProductPageOptions {
  page?: number
  signal?: AbortSignal
}

export function getProductPage({
  page = 1,
  signal,
}: ProductPageOptions = {}): Promise<ProductPage> {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError('Page must be a positive integer.')
  }

  const parameters = new URLSearchParams({ page: page.toString() })
  return apiRequest<ProductPage>(`/products?${parameters}`, { signal })
}

export function getCategories(signal?: AbortSignal): Promise<Category[]> {
  return apiRequest<Category[]>('/categories', { signal })
}
