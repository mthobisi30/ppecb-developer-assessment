import { useEffect, useReducer, useState } from 'react'
import { getProductPage } from './catalogApi.ts'
import { DeleteProductConfirmation } from './DeleteProductConfirmation.tsx'
import { ProductForm } from './ProductForm.tsx'
import { ProductImageForm } from './ProductImageForm.tsx'
import {
  catalogReducer,
  formatProductPrice,
  getCatalogErrorMessage,
  getPageAfterProductDelete,
  getProductRangeLabel,
  initialCatalogState,
} from './catalogState.ts'
import type { Product, ProductPage } from './catalogTypes.ts'

type ProductAction =
  | { kind: 'create' }
  | { kind: 'edit'; product: Product }
  | { kind: 'image'; product: Product }
  | { kind: 'delete'; product: Product }

export function CatalogPage() {
  const [state, dispatch] = useReducer(catalogReducer, initialCatalogState)
  const [requestVersion, setRequestVersion] = useState(0)
  const [activeAction, setActiveAction] = useState<ProductAction | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

  function openAction(action: ProductAction) {
    setActiveAction(action)
    setSuccessMessage(null)
  }

  function finishAction(page: number, message: string) {
    setActiveAction(null)
    setSuccessMessage(message)
    dispatch({ type: 'pageRequested', page })
    setRequestVersion((version) => version + 1)
  }

  function handleProductCreated(product: Product) {
    finishAction(1, `${product.name} was added to the catalogue.`)
  }

  function handleProductUpdated(product: Product) {
    finishAction(state.page, `${product.name} was updated.`)
  }

  function handleImageUploaded(product: Product) {
    finishAction(state.page, `The image for ${product.name} was updated.`)
  }

  function handleProductDeleted(product: Product) {
    const targetPage = getPageAfterProductDelete(
      state.page,
      state.data?.items.length ?? 0,
    )
    finishAction(targetPage, `${product.name} was deleted.`)
  }

  return (
    <section className="catalog-page" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <div>
          <h1 id="catalog-title">Product catalogue</h1>
          <p>View and manage the products registered in the catalogue.</p>
        </div>
        {activeAction === null && (
          <button
            className="button button-primary catalog-add-button"
            onClick={() => openAction({ kind: 'create' })}
            type="button"
          >
            Add product
          </button>
        )}
      </div>

      {successMessage !== null && (
        <p className="alert alert-success catalog-alert" role="status">
          {successMessage}
        </p>
      )}
      {activeAction?.kind === 'create' && (
        <ProductForm
          onCancel={() => setActiveAction(null)}
          onSaved={handleProductCreated}
        />
      )}
      {activeAction?.kind === 'edit' && (
        <ProductForm
          onCancel={() => setActiveAction(null)}
          onSaved={handleProductUpdated}
          product={activeAction.product}
        />
      )}
      {activeAction?.kind === 'image' && (
        <ProductImageForm
          onCancel={() => setActiveAction(null)}
          onUploaded={handleImageUploaded}
          product={activeAction.product}
        />
      )}
      {activeAction?.kind === 'delete' && (
        <DeleteProductConfirmation
          onCancel={() => setActiveAction(null)}
          onDeleted={handleProductDeleted}
          product={activeAction.product}
        />
      )}

      {activeAction === null && state.status === 'loading' && <CatalogLoading />}
      {activeAction === null && state.status === 'error' && (
        <CatalogError message={state.error ?? ''} onRetry={retry} />
      )}
      {activeAction === null && state.status === 'ready' && state.data !== null && (
        state.data.totalCount === 0
          ? <EmptyCatalog />
          : (
              <CatalogResults
                data={state.data}
                onDelete={(product) => openAction({ kind: 'delete', product })}
                onEdit={(product) => openAction({ kind: 'edit', product })}
                onImage={(product) => openAction({ kind: 'image', product })}
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
  onDelete: (product: Product) => void
  onEdit: (product: Product) => void
  onImage: (product: Product) => void
  onPageChange: (page: number) => void
}

function CatalogResults({
  data,
  onDelete,
  onEdit,
  onImage,
  onPageChange,
}: CatalogResultsProps) {
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
              <th className="actions-column" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((product) => (
              <ProductRow
                key={product.productId}
                onDelete={onDelete}
                onEdit={onEdit}
                onImage={onImage}
                product={product}
              />
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

interface ProductRowProps {
  onDelete: (product: Product) => void
  onEdit: (product: Product) => void
  onImage: (product: Product) => void
  product: Product
}

function ProductRow({
  onDelete,
  onEdit,
  onImage,
  product,
}: ProductRowProps) {
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
      <td className="actions-column">
        <div className="row-actions">
          <button
            aria-label={`Edit ${product.name}`}
            className="row-action-button"
            onClick={() => onEdit(product)}
            type="button"
          >
            Edit
          </button>
          <button
            aria-label={`Change image for ${product.name}`}
            className="row-action-button"
            onClick={() => onImage(product)}
            type="button"
          >
            Image
          </button>
          <button
            aria-label={`Delete ${product.name}`}
            className="row-action-button row-action-danger"
            onClick={() => onDelete(product)}
            type="button"
          >
            Delete
          </button>
        </div>
      </td>
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
