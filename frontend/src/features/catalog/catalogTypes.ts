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

export interface Category {
  categoryId: number
  name: string
  categoryCode: string
  isActive: boolean
  rowVersion: string
}
