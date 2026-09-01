import { apiRequest } from '../../api/index.ts'
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './categoryTypes.ts'

export function getCategories(signal?: AbortSignal): Promise<Category[]> {
  return apiRequest<Category[]>('/categories', { signal })
}

export function createCategory(
  input: CreateCategoryInput,
  signal?: AbortSignal,
): Promise<Category> {
  return apiRequest<Category>('/categories', {
    method: 'POST',
    json: input,
    signal,
  })
}

export function updateCategory(
  categoryId: number,
  input: UpdateCategoryInput,
  signal?: AbortSignal,
): Promise<Category> {
  if (!Number.isInteger(categoryId) || categoryId < 1) {
    throw new RangeError('Category ID must be a positive integer.')
  }

  return apiRequest<Category>(`/categories/${categoryId}`, {
    method: 'PUT',
    json: input,
    signal,
  })
}
