import { useEffect, useReducer, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileUp,
  ImageUp,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { IconButton } from '../../components/IconButton.tsx'
import {
  exportProductsToSpreadsheet,
  getProductPage,
} from './catalogApi.ts'
import { DeleteProductConfirmation } from './DeleteProductConfirmation.tsx'
import { ProductForm } from './ProductForm.tsx'
import { ProductImageForm } from './ProductImageForm.tsx'
import { ProductSpreadsheetImport } from './ProductSpreadsheetImport.tsx'
import {
  catalogReducer,
  formatProductPrice,
  getCatalogErrorMessage,
  getPageAfterProductDelete,
  getProductRangeLabel,
  initialCatalogState,
} from './catalogState.ts'
import { getSpreadsheetExportError } from './spreadsheetExchange.ts'
import type {
  Product,
  ProductPage,
  ProductSort,
  ProductSortField,
} from './catalogTypes.ts'

type ProductAction =
  | { kind: 'create' }
  | { kind: 'import' }
  | { kind: 'edit'; product: Product }
  | { kind: 'image'; product: Product }
  | { kind: 'delete'; product: Product }

export function CatalogPage() {
  const [state, dispatch] = useReducer(catalogReducer, initialCatalogState)
  const [requestVersion, setRequestVersion] = useState(0)
  const [activeAction, setActiveAction] = useState<ProductAction | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const { page, sort } = state

  useEffect(() => {
    const controller = new AbortController()

    void getProductPage({
      page,
      sortBy: sort.field,
      sortDirection: sort.direction,
      signal: controller.signal,
    })
      .then((data) => {
        dispatch({ type: 'pageLoaded', page, sort, data })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({
            type: 'pageFailed',
            page,
            sort,
            message: getCatalogErrorMessage(error),
          })
        }
      })

    return () => controller.abort()
  }, [page, requestVersion, sort])

  function selectPage(page: number) {
    dispatch({ type: 'pageRequested', page })
  }

  function selectSort(field: ProductSortField) {
    const direction = sort.field === field && sort.direction === 'ascending'
      ? 'descending'
      : 'ascending'

    dispatch({
      type: 'sortRequested',
      sort: { field, direction },
    })
  }

  function retry() {
    dispatch({ type: 'pageRequested', page })
    setRequestVersion((version) => version + 1)
  }

  function openAction(action: ProductAction) {
    setActiveAction(action)
    setSuccessMessage(null)
    setActionError(null)
  }

  function finishAction(page: number, message: string) {
    setActiveAction(null)
    setSuccessMessage(message)
    setActionError(null)
    dispatch({ type: 'pageRequested', page })
    setRequestVersion((version) => version + 1)
  }

  function handleProductCreated(product: Product) {
    finishAction(1, `${product.name} was added to the catalogue.`)
  }

  function handleProductUpdated(product: Product) {
    finishAction(page, `${product.name} was updated.`)
  }

  function handleImageUploaded(product: Product) {
    finishAction(page, `The image for ${product.name} was updated.`)
  }

  function handleProductDeleted(product: Product) {
    const targetPage = getPageAfterProductDelete(
      page,
      state.data?.items.length ?? 0,
    )
    finishAction(targetPage, `${product.name} was deleted.`)
  }

  function handleProductsImported(count: number) {
    const productLabel = count === 1 ? 'product' : 'products'
    finishAction(1, `${count} ${productLabel} imported.`)
  }

  async function handleExport() {
    setIsExporting(true)
    setSuccessMessage(null)
    setActionError(null)

    try {
      downloadProductSpreadsheet(await exportProductsToSpreadsheet())
      setSuccessMessage('Product spreadsheet exported.')
    } catch (error) {
      setActionError(getSpreadsheetExportError(error))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <section className="catalog-page" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <div>
          <h1 id="catalog-title">Product catalogue</h1>
          <p>View and manage the products registered in the catalogue.</p>
        </div>
        {activeAction === null && (
          <div className="catalog-actions">
            <IconButton
              disabled={isExporting}
              icon={<FileUp aria-hidden="true" size={18} strokeWidth={1.8} />}
              label="Import products"
              onClick={() => openAction({ kind: 'import' })}
              type="button"
            />
            <IconButton
              disabled={isExporting}
              icon={isExporting
                ? <LoaderCircle aria-hidden="true" className="icon-spin" size={18} strokeWidth={1.8} />
                : <FileDown aria-hidden="true" size={18} strokeWidth={1.8} />}
              label={isExporting ? 'Exporting products' : 'Export products'}
              onClick={() => void handleExport()}
              type="button"
            />
            <IconButton
              disabled={isExporting}
              icon={<Plus aria-hidden="true" size={19} strokeWidth={1.8} />}
              label="Add product"
              onClick={() => openAction({ kind: 'create' })}
              type="button"
              variant="primary"
            />
          </div>
        )}
      </div>

      {successMessage !== null && (
        <p className="alert alert-success catalog-alert" role="status">
          {successMessage}
        </p>
      )}
      {actionError !== null && (
        <p className="alert alert-error catalog-alert" role="alert">
          {actionError}
        </p>
      )}
      {activeAction?.kind === 'import' && (
        <ProductSpreadsheetImport
          onCancel={() => setActiveAction(null)}
          onImported={handleProductsImported}
        />
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
                onSortChange={selectSort}
                sort={sort}
              />
            )
      )}
    </section>
  )
}

function downloadProductSpreadsheet(workbook: Blob) {
  const url = URL.createObjectURL(workbook)
  const link = document.createElement('a')
  link.href = url
  link.download = 'products.xlsx'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
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
      <IconButton
        icon={<RotateCw aria-hidden="true" size={18} strokeWidth={1.8} />}
        label="Try again"
        onClick={onRetry}
        type="button"
      />
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
  onSortChange: (field: ProductSortField) => void
  sort: ProductSort
}

function CatalogResults({
  data,
  onDelete,
  onEdit,
  onImage,
  onPageChange,
  onSortChange,
  sort,
}: CatalogResultsProps) {
  return (
    <div className="catalog-results">
      <div className="product-table-scroll">
        <table className="product-table">
          <caption>Products in the catalogue</caption>
          <thead>
            <tr>
              <SortableColumnHeader
                field="name"
                label="Product"
                onSortChange={onSortChange}
                sort={sort}
              />
              <SortableColumnHeader
                field="productCode"
                label="Code"
                onSortChange={onSortChange}
                sort={sort}
              />
              <SortableColumnHeader
                field="categoryName"
                label="Category"
                onSortChange={onSortChange}
                sort={sort}
              />
              <SortableColumnHeader
                className="price-column"
                field="price"
                label="Price"
                onSortChange={onSortChange}
                sort={sort}
              />
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
          <IconButton
            className="pagination-button"
            disabled={data.page <= 1}
            icon={<ChevronLeft aria-hidden="true" size={18} strokeWidth={1.8} />}
            label="Previous page"
            onClick={() => onPageChange(data.page - 1)}
            type="button"
          />
          <span>Page {data.page} of {data.totalPages}</span>
          <IconButton
            className="pagination-button"
            disabled={data.page >= data.totalPages}
            icon={<ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />}
            label="Next page"
            onClick={() => onPageChange(data.page + 1)}
            type="button"
          />
        </div>
      </nav>
    </div>
  )
}

interface SortableColumnHeaderProps {
  className?: string
  field: ProductSortField
  label: string
  onSortChange: (field: ProductSortField) => void
  sort: ProductSort
}

function SortableColumnHeader({
  className,
  field,
  label,
  onSortChange,
  sort,
}: SortableColumnHeaderProps) {
  const isActive = sort.field === field
  const direction = isActive ? sort.direction : 'ascending'
  const nextDirection = direction === 'ascending' ? 'descending' : 'ascending'
  const sortIcon = isActive
    ? direction === 'ascending'
      ? <ArrowUp aria-hidden="true" size={15} strokeWidth={1.8} />
      : <ArrowDown aria-hidden="true" size={15} strokeWidth={1.8} />
    : <ArrowUpDown aria-hidden="true" size={15} strokeWidth={1.8} />
  const sortLabel = isActive
    ? `${label}, sorted ${direction}. Sort ${nextDirection}.`
    : `Sort by ${label} ascending.`

  return (
    <th
      aria-sort={isActive ? direction : undefined}
      className={className}
      scope="col"
    >
      <span>{label}</span>
      <IconButton
        className="sort-icon-button"
        icon={sortIcon}
        label={sortLabel}
        onClick={() => onSortChange(field)}
        tooltip={`Sort ${label} ${nextDirection}`}
        type="button"
        variant="quiet"
      />
    </th>
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
          <IconButton
            className="row-action-button"
            icon={<Pencil aria-hidden="true" size={17} strokeWidth={1.8} />}
            label={`Edit ${product.name}`}
            onClick={() => onEdit(product)}
            tooltip="Edit product"
            type="button"
            variant="quiet"
          />
          <IconButton
            className="row-action-button"
            icon={<ImageUp aria-hidden="true" size={17} strokeWidth={1.8} />}
            label={`Change image for ${product.name}`}
            onClick={() => onImage(product)}
            tooltip="Change product image"
            type="button"
            variant="quiet"
          />
          <IconButton
            className="row-action-button row-action-danger"
            icon={<Trash2 aria-hidden="true" size={17} strokeWidth={1.8} />}
            label={`Delete ${product.name}`}
            onClick={() => onDelete(product)}
            tooltip="Delete product"
            type="button"
            variant="quiet"
          />
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
