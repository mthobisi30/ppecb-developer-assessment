import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { uploadProductImage } from './catalogApi.ts'
import {
  getImageUploadFailure,
  validateProductImage,
} from './productActions.ts'
import type { Product } from './catalogTypes.ts'

interface ProductImageFormProps {
  onCancel: () => void
  onUploaded: (product: Product) => void
  product: Product
}

export function ProductImageForm({
  onCancel,
  onUploaded,
  product,
}: ProductImageFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(product.imagePath)
  const objectUrl = useRef<string | null>(null)

  useEffect(() => () => {
    if (objectUrl.current !== null) {
      URL.revokeObjectURL(objectUrl.current)
    }
  }, [])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null
    const selectionError = selectedFile === null
      ? 'Choose an image.'
      : validateProductImage(selectedFile)

    if (objectUrl.current !== null) {
      URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = null
    }

    if (selectedFile === null || selectionError !== undefined) {
      setPreviewUrl(product.imagePath)
    } else {
      objectUrl.current = URL.createObjectURL(selectedFile)
      setPreviewUrl(objectUrl.current)
    }

    setFile(selectedFile)
    setFieldError(selectionError ?? null)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (file === null) {
      setFieldError('Choose an image.')
      return
    }

    const validationError = validateProductImage(file)

    if (validationError !== undefined) {
      setFieldError(validationError)
      return
    }

    setIsSubmitting(true)
    setFieldError(null)
    setFormError(null)

    try {
      onUploaded(await uploadProductImage(product.productId, file))
    } catch (error) {
      const failure = getImageUploadFailure(error)
      setFieldError(failure.fieldError)
      setFormError(failure.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="management-panel" aria-labelledby="image-form-title">
      <div className="management-heading">
        <div>
          <h2 id="image-form-title">Product image</h2>
          <p>Upload an image for {product.name}.</p>
        </div>
      </div>

      <form className="image-upload-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {formError !== null && (
          <p className="alert alert-error" role="alert">{formError}</p>
        )}

        <div className="image-upload-content">
          <ProductImagePreview name={product.name} previewUrl={previewUrl} />
          <div className="image-file-field">
            <label htmlFor="product-image">Choose image</label>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
              aria-describedby={fieldError === null
                ? 'product-image-help'
                : 'product-image-help product-image-error'}
              aria-invalid={fieldError !== null}
              id="product-image"
              onChange={handleFileChange}
              type="file"
            />
            <span className="field-help" id="product-image-help">
              JPG, PNG, WebP, GIF, or BMP. Maximum size 5 MB.
            </span>
            {fieldError !== null && (
              <span className="field-error" id="product-image-error">{fieldError}</span>
            )}
            {file !== null && fieldError === null && (
              <span className="selected-file">Selected: {file.name}</span>
            )}
          </div>
        </div>

        <div className="product-form-actions">
          <button
            className="button button-secondary"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={isSubmitting || file === null || fieldError !== null}
            type="submit"
          >
            {isSubmitting ? 'Uploading image...' : 'Upload image'}
          </button>
        </div>
      </form>
    </section>
  )
}

interface ProductImagePreviewProps {
  name: string
  previewUrl: string | null
}

function ProductImagePreview({ name, previewUrl }: ProductImagePreviewProps) {
  return previewUrl === null
    ? (
        <span className="image-preview image-preview-placeholder" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
      )
    : <img className="image-preview" src={previewUrl} alt={`Preview of ${name}`} />
}
