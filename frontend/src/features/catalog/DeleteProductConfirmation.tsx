import { useState } from 'react'
import { LoaderCircle, Trash2, X } from 'lucide-react'
import { IconButton } from '../../components/IconButton.tsx'
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
        <IconButton
          disabled={isDeleting}
          icon={<X aria-hidden="true" size={18} strokeWidth={1.8} />}
          label="Cancel"
          onClick={onCancel}
          type="button"
        />
        <IconButton
          disabled={isDeleting}
          icon={isDeleting
            ? <LoaderCircle aria-hidden="true" className="icon-spin" size={18} strokeWidth={1.8} />
            : <Trash2 aria-hidden="true" size={18} strokeWidth={1.8} />}
          label={isDeleting ? 'Deleting product' : 'Delete product'}
          onClick={() => void handleDelete()}
          type="button"
          variant="danger"
        />
      </div>
    </section>
  )
}
