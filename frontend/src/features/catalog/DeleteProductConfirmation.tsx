import { useState } from 'react'
import { deleteProduct } from './catalogApi.ts'
import { getProductActionError } from './productActions.ts'
import type { Product } from './catalogTypes.ts'

interface DeleteProductConfirmationProps {
  onCancel: () => void
  onDeleted: (product: Product) => void
  product: Product
}

export function DeleteProductConfirmation({
  onCancel,
  onDeleted,
  product,
}: DeleteProductConfirmationProps) {
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)

    try {
      await deleteProduct(product.productId)
      onDeleted(product)
    } catch (requestError) {
      setError(getProductActionError(
        requestError,
        'The product could not be deleted. Please try again.',
      ))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="management-panel delete-panel" aria-labelledby="delete-product-title">
      <div className="management-heading">
        <div>
          <h2 id="delete-product-title">Delete product</h2>
          <p>This action cannot be undone.</p>
        </div>
      </div>

      {error !== null && (
        <p className="alert alert-error" role="alert">{error}</p>
      )}
      <p>Delete <strong>{product.name}</strong> from the catalogue?</p>

      <div className="product-form-actions">
        <button
          className="button button-secondary"
          disabled={isDeleting}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="button button-danger"
          disabled={isDeleting}
          onClick={() => void handleDelete()}
          type="button"
        >
          {isDeleting ? 'Deleting product...' : 'Delete product'}
        </button>
      </div>
    </section>
  )
}
