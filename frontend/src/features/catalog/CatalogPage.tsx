import { useEffect, useReducer, useState } from 'react'
import { getProductPage } from './catalogApi.ts'
import {
  catalogReducer,
  formatProductPrice,
  getCatalogErrorMessage,
  getProductRangeLabel,
  initialCatalogState,
} from './catalogState.ts'
import type { Product, ProductPage } from './catalogTypes.ts'

export function CatalogPage() {
  const [state, dispatch] = useReducer(catalogReducer, initialCatalogState)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    void getProductPage({ page: state.page, signal: controller.signal })
      .then((data) => {
        dispatch({ type: 'pageLoaded', page: state.page, data })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({
            type: 'pageFailed',
            page: state.page,
            message: getCatalogErrorMessage(error),
          })
        }
      })

    return () => controller.abort()
  }, [state.page, requestVersion])

  function selectPage(page: number) {
    dispatch({ type: 'pageRequested', page })
  }

  function retry() {
    dispatch({ type: 'pageRequested', page: state.page })
    setRequestVersion((version) => version + 1)
  }

  return (
    <section className="catalog-page" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <h1 id="catalog-title">Product catalogue</h1>
        <p>View the products registered in the catalogue.</p>
      </div>

      {state.status === 'loading' && <CatalogLoading />}
      {state.status === 'error' && (
        <CatalogError message={state.error ?? ''} onRetry={retry} />
      )}
      {state.status === 'ready' && state.data !== null && (
        state.data.totalCount === 0
          ? <EmptyCatalog />
          : (
              <CatalogResults
                data={state.data}
                onPageChange={selectPage}
              />
            )
      )}
    </section>
  )
}

function CatalogLoading() {
  return (
    <div className="catalog-state" aria-busy="true" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>Loading products...</p>
    </div>
  )
}

interface CatalogErrorProps {
  message: string
  onRetry: () => void
}

function CatalogError({ message, onRetry }: CatalogErrorProps) {
  return (
    <div className="catalog-state" role="alert">
      <h2>Unable to load products</h2>
      <p>{message}</p>
      <button className="button button-secondary" onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  )
}

function EmptyCatalog() {
  return (
    <div className="catalog-state">
      <h2>No products found</h2>
      <p>Products will appear here once they have been added.</p>
    </div>
  )
}

interface CatalogResultsProps {
  data: ProductPage
  onPageChange: (page: number) => void
}

function CatalogResults({ data, onPageChange }: CatalogResultsProps) {
  return (
    <div className="catalog-results">
      <div className="product-table-scroll">
        <table className="product-table">
          <caption>Products in the catalogue</caption>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Code</th>
              <th scope="col">Category</th>
              <th className="price-column" scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((product) => (
              <ProductRow key={product.productId} product={product} />
            ))}
          </tbody>
        </table>
      </div>
      <nav className="catalog-pagination" aria-label="Product catalogue pages">
        <span>{getProductRangeLabel(data)}</span>
        <div className="pagination-actions">
          <button
            className="pagination-button"
            disabled={data.page <= 1}
            onClick={() => onPageChange(data.page - 1)}
            type="button"
          >
            Previous
          </button>
          <span>Page {data.page} of {data.totalPages}</span>
          <button
            className="pagination-button"
            disabled={data.page >= data.totalPages}
            onClick={() => onPageChange(data.page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  )
}

function ProductRow({ product }: { product: Product }) {
  return (
    <tr>
      <td>
        <div className="product-summary">
          <ProductImage product={product} />
          <span>{product.name}</span>
        </div>
      </td>
      <td className="product-code">{product.productCode}</td>
      <td>{product.categoryName}</td>
      <td className="price-column">{formatProductPrice(product.price)}</td>
    </tr>
  )
}

function ProductImage({ product }: { product: Product }) {
  if (product.imagePath !== null) {
    return (
      <img
        className="product-image"
        src={product.imagePath}
        alt=""
        width="48"
        height="48"
      />
    )
  }

  return (
    <span className="product-image product-image-placeholder" aria-hidden="true">
      {product.name.charAt(0).toUpperCase()}
    </span>
  )
}
