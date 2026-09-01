import { apiRequest } from '../../api/index.ts'
import type {
  Category,
  CreateProductInput,
  Product,
  ProductPage,
  UpdateProductInput,
} from './catalogTypes.ts'

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

export function createProduct(
  input: CreateProductInput,
  signal?: AbortSignal,
): Promise<Product> {
  return apiRequest<Product>('/products', {
    method: 'POST',
    json: input,
    signal,
  })
}

export function uploadProductImage(
  productId: number,
  file: File,
  signal?: AbortSignal,
): Promise<Product> {
  assertProductId(productId)

  const formData = new FormData()
  formData.append('file', file)

  return apiRequest<Product>(`/products/${productId}/image`, {
    method: 'POST',
    body: formData,
    signal,
  })
}

export function updateProduct(
  productId: number,
  input: UpdateProductInput,
  signal?: AbortSignal,
): Promise<Product> {
  assertProductId(productId)

  return apiRequest<Product>(`/products/${productId}`, {
    method: 'PUT',
    json: input,
    signal,
  })
}

export function deleteProduct(
  productId: number,
  signal?: AbortSignal,
): Promise<void> {
  assertProductId(productId)

  return apiRequest<void>(`/products/${productId}`, {
    method: 'DELETE',
    signal,
  })
}

function assertProductId(productId: number): void {
  if (!Number.isInteger(productId) || productId < 1) {
    throw new RangeError('Product ID must be a positive integer.')
  }
}
