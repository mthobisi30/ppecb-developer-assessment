import type { PagedResponse } from '../../api/index.ts'

export interface Product {
  productId: number
  productCode: string
  name: string
  description: string | null
  price: number
  categoryId: number
  categoryName: string
  imagePath: string | null
  rowVersion: string
}

export type ProductPage = PagedResponse<Product>

export type ProductSortField = 'name' | 'productCode' | 'categoryName' | 'price'

export type ProductSortDirection = 'ascending' | 'descending'

export interface ProductSort {
  field: ProductSortField
  direction: ProductSortDirection
}

export interface CreateProductInput {
  name: string
  description: string | null
  price: number
  categoryId: number
}

export interface UpdateProductInput extends CreateProductInput {
  rowVersion: string
}

export interface ProductImportResult {
  importedCount: number
}
