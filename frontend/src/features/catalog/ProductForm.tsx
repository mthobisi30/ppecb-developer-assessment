import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, Plus, RotateCw, Save, X } from 'lucide-react'
import { IconButton } from '../../components/IconButton.tsx'
import { getCategories } from '../categories/index.ts'
import type { Category } from '../categories/index.ts'
import { createProduct, updateProduct } from './catalogApi.ts'
import {
  getProductFormFailure,
  getProductFormValues,
  toCreateProductInput,
  toUpdateProductInput,
  validateProductForm,
} from './productForm.ts'
import type { ProductFieldErrors, ProductFormValues } from './productForm.ts'
import type { Product } from './catalogTypes.ts'

interface ProductFormProps {
  onCancel: () => void
  onSaved: (product: Product) => void
  product?: Product
}

export function ProductForm({ onCancel, onSaved, product }: ProductFormProps) {
  const [values, setValues] = useState(() => getProductFormValues(product))
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categoryRequestVersion, setCategoryRequestVersion] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    void getCategories(controller.signal)
      .then((result) => {
        setCategories(result.filter(
          (category) => category.isActive
            || category.categoryId === product?.categoryId,
        ))
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCategoryError('Categories could not be loaded. Please try again.')
        }
      })

    return () => controller.abort()
  }, [categoryRequestVersion, product?.categoryId])

  function retryCategories() {
    setCategories(null)
    setCategoryError(null)
    setCategoryRequestVersion((version) => version + 1)
  }

  function updateValue(field: keyof ProductFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedValues = {
      ...values,
      name: values.name.trim(),
      description: values.description.trim(),
    }
    const errors = validateProductForm(normalizedValues)

    if (categories !== null && !categories.some(
      (category) => category.isActive
        && category.categoryId === Number(normalizedValues.categoryId),
    )) {
      errors.categoryId = 'Select an active category.'
    }

    setFieldErrors(errors)
    setFormError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const input = toCreateProductInput(normalizedValues)
      const savedProduct = product === undefined
        ? await createProduct(input)
        : await updateProduct(
            product.productId,
            toUpdateProductInput(normalizedValues, product.rowVersion),
          )
      onSaved(savedProduct)
    } catch (error) {
      const failure = getProductFormFailure(error)
      setFieldErrors(failure.fieldErrors)
      setFormError(failure.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasCategories = categories?.some((category) => category.isActive) ?? false
  const isEditing = product !== undefined

  return (
    <section className="product-form-panel" aria-labelledby="product-form-title">
      <div className="product-form-heading">
        <div>
          <h2 id="product-form-title">{isEditing ? 'Edit product' : 'Add product'}</h2>
          <p>{isEditing ? `Update ${product.name}.` : 'Enter the product details below.'}</p>
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        {formError !== null && (
          <p className="alert alert-error" role="alert">{formError}</p>
        )}
        {categoryError !== null && (
          <div className="alert alert-error category-load-error" role="alert">
            <span>{categoryError}</span>
            <IconButton
              icon={<RotateCw aria-hidden="true" size={16} strokeWidth={1.8} />}
              label="Try again"
              onClick={retryCategories}
              type="button"
              variant="quiet"
            />
          </div>
        )}

        <div className="product-form-grid">
          <FormField error={fieldErrors.name} id="product-name" label="Name">
            <input
              aria-describedby={fieldErrors.name === undefined ? undefined : 'product-name-error'}
              aria-invalid={fieldErrors.name !== undefined}
              autoFocus
              id="product-name"
              maxLength={200}
              onChange={(event) => updateValue('name', event.target.value)}
              placeholder="Enter product name"
              type="text"
              value={values.name}
            />
          </FormField>

          <FormField error={fieldErrors.categoryId} id="product-category" label="Category">
            <select
              aria-describedby={fieldErrors.categoryId === undefined
                ? undefined
                : 'product-category-error'}
              aria-invalid={fieldErrors.categoryId !== undefined}
              disabled={categories === null || categoryError !== null}
              id="product-category"
              onChange={(event) => updateValue('categoryId', event.target.value)}
              value={values.categoryId}
            >
              <option value="">
                {categoryError !== null
                  ? 'Categories unavailable'
                  : categories === null
                    ? 'Loading categories...'
                    : 'Select category'}
              </option>
              {categories?.map((category) => (
                <option
                  disabled={!category.isActive}
                  key={category.categoryId}
                  value={category.categoryId}
                >
                  {category.name}{category.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
            {categories !== null && !hasCategories && (
              <span className="field-help">No active categories are available.</span>
            )}
          </FormField>

          <FormField error={fieldErrors.price} id="product-price" label="Price">
            <div className="price-input">
              <span aria-hidden="true">R</span>
              <input
                aria-describedby={fieldErrors.price === undefined ? undefined : 'product-price-error'}
                aria-invalid={fieldErrors.price !== undefined}
                id="product-price"
                inputMode="decimal"
                min="0"
                onChange={(event) => updateValue('price', event.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={values.price}
              />
            </div>
          </FormField>

          <FormField
            className="description-field"
            error={fieldErrors.description}
            id="product-description"
            label="Description (optional)"
          >
            <textarea
              aria-describedby={fieldErrors.description === undefined
                ? undefined
                : 'product-description-error'}
              aria-invalid={fieldErrors.description !== undefined}
              id="product-description"
              maxLength={2000}
              onChange={(event) => updateValue('description', event.target.value)}
              placeholder="Enter a short description"
              rows={4}
              value={values.description}
            />
          </FormField>
        </div>

        <div className="product-form-actions">
          <IconButton
            disabled={isSubmitting}
            icon={<X aria-hidden="true" size={18} strokeWidth={1.8} />}
            label="Cancel"
            onClick={onCancel}
            type="button"
          />
          <IconButton
            disabled={isSubmitting || !hasCategories}
            icon={isSubmitting
              ? <LoaderCircle aria-hidden="true" className="icon-spin" size={18} strokeWidth={1.8} />
              : isEditing
                ? <Save aria-hidden="true" size={18} strokeWidth={1.8} />
                : <Plus aria-hidden="true" size={18} strokeWidth={1.8} />}
            label={isSubmitting
              ? isEditing ? 'Saving changes' : 'Adding product'
              : isEditing ? 'Save changes' : 'Add product'}
            type="submit"
            variant="primary"
          />
        </div>
      </form>
    </section>
  )
}

interface FormFieldProps {
  children: React.ReactNode
  className?: string
  error?: string
  id: string
  label: string
}

function FormField({
  children,
  className = '',
  error,
  id,
  label,
}: FormFieldProps) {
  return (
    <div className={`catalog-field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error !== undefined && (
        <span className="field-error" id={`${id}-error`}>{error}</span>
      )}
    </div>
  )
}
