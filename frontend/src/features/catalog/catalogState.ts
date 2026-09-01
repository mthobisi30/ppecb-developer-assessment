import { ApiError } from '../../api/index.ts'
import type { ProductPage } from './catalogTypes.ts'

export interface CatalogState {
  data: ProductPage | null
  error: string | null
  page: number
  status: 'loading' | 'ready' | 'error'
}

export type CatalogAction =
  | { type: 'pageRequested'; page: number }
  | { type: 'pageLoaded'; page: number; data: ProductPage }
  | { type: 'pageFailed'; page: number; message: string }

export const initialCatalogState: CatalogState = {
  data: null,
  error: null,
  page: 1,
  status: 'loading',
}

export function catalogReducer(
  state: CatalogState,
  action: CatalogAction,
): CatalogState {
  if (action.type !== 'pageRequested' && action.page !== state.page) {
    return state
  }

  switch (action.type) {
    case 'pageRequested':
      return {
        data: null,
        error: null,
        page: action.page,
        status: 'loading',
      }
    case 'pageLoaded':
      return {
        data: action.data,
        error: null,
        page: action.page,
        status: 'ready',
      }
    case 'pageFailed':
      return {
        data: null,
        error: action.message,
        page: action.page,
        status: 'error',
      }
  }
}

export function getCatalogErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Products could not be loaded. Please try again.'
}

export function formatProductPrice(price: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(price)
}

export function getProductRangeLabel(data: ProductPage): string {
  if (data.totalCount === 0) {
    return '0 products'
  }

  const first = (data.page - 1) * data.pageSize + 1
  const last = first + data.items.length - 1
  return `${first}–${last} of ${data.totalCount} products`
}

export function getPageAfterProductDelete(
  page: number,
  itemCount: number,
): number {
  return itemCount === 1 && page > 1 ? page - 1 : page
}
