import { ApiError } from '../../api/index.ts'
import type { ProductPage, ProductSort } from './catalogTypes.ts'

export interface CatalogState {
  data: ProductPage | null
  error: string | null
  page: number
  sort: ProductSort
  status: 'loading' | 'ready' | 'error'
}

export type CatalogAction =
  | { type: 'pageRequested'; page: number }
  | { type: 'sortRequested'; sort: ProductSort }
  | { type: 'pageLoaded'; page: number; sort: ProductSort; data: ProductPage }
  | { type: 'pageFailed'; page: number; sort: ProductSort; message: string }

export const initialCatalogState: CatalogState = {
  data: null,
  error: null,
  page: 1,
  sort: {
    field: 'name',
    direction: 'ascending',
  },
  status: 'loading',
}

export function catalogReducer(
  state: CatalogState,
  action: CatalogAction,
): CatalogState {
  if (
    (action.type === 'pageLoaded' || action.type === 'pageFailed')
    && (action.page !== state.page || !isSameSort(action.sort, state.sort))
  ) {
    return state
  }

  switch (action.type) {
    case 'pageRequested':
      return {
        data: null,
        error: null,
        page: action.page,
        sort: state.sort,
        status: 'loading',
      }
    case 'sortRequested':
      return {
        data: null,
        error: null,
        page: 1,
        sort: action.sort,
        status: 'loading',
      }
    case 'pageLoaded':
      return {
        data: action.data,
        error: null,
        page: action.page,
        sort: action.sort,
        status: 'ready',
      }
    case 'pageFailed':
      return {
        data: null,
        error: action.message,
        page: action.page,
        sort: action.sort,
        status: 'error',
      }
  }
}

function isSameSort(left: ProductSort, right: ProductSort): boolean {
  return left.field === right.field && left.direction === right.direction
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
