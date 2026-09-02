import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, Plus, Save, X } from 'lucide-react'
import { IconButton } from '../../components/IconButton.tsx'
import { createCategory, updateCategory } from './categoryApi.ts'
import {
  getCategoryFormFailure,
  getCategoryFormValues,
  toCreateCategoryInput,
  toUpdateCategoryInput,
  validateCategoryForm,
} from './categoryForm.ts'
import type { CategoryFieldErrors } from './categoryForm.ts'
import type { Category } from './categoryTypes.ts'

interface CategoryFormProps {
  category?: Category
  onCancel: () => void
  onSaved: (category: Category) => void
}

export function CategoryForm({
  category,
  onCancel,
  onSaved,
}: CategoryFormProps) {
  const [values, setValues] = useState(() => getCategoryFormValues(category))
  const [fieldErrors, setFieldErrors] = useState<CategoryFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = category !== undefined

  function updateName(name: string) {
    setValues((current) => ({ ...current, name }))
    setFieldErrors((current) => ({ ...current, name: undefined }))
  }

  function updateCode(categoryCode: string) {
    setValues((current) => ({
      ...current,
      categoryCode: categoryCode.toUpperCase(),
    }))
    setFieldErrors((current) => ({ ...current, categoryCode: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedValues = {
      ...values,
      name: values.name.trim(),
      categoryCode: values.categoryCode.trim(),
    }
    const errors = validateCategoryForm(normalizedValues)

    setFieldErrors(errors)
    setFormError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const savedCategory = category === undefined
        ? await createCategory(toCreateCategoryInput(normalizedValues))
        : await updateCategory(
            category.categoryId,
            toUpdateCategoryInput(normalizedValues, category.rowVersion),
          )
      onSaved(savedCategory)
    } catch (error) {
      const failure = getCategoryFormFailure(error)
      setFieldErrors(failure.fieldErrors)
      setFormError(failure.formError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="management-panel" aria-labelledby="category-form-title">
      <div className="management-heading">
        <div>
          <h2 id="category-form-title">
            {isEditing ? 'Edit category' : 'Add category'}
          </h2>
          <p>{isEditing ? `Update ${category.name}.` : 'Enter the category details below.'}</p>
        </div>
      </div>

      <form className="category-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {formError !== null && (
          <p className="alert alert-error" role="alert">{formError}</p>
        )}

        <div className="category-form-grid">
          <div className="catalog-field">
            <label htmlFor="category-name">Name</label>
            <input
              aria-describedby={fieldErrors.name === undefined ? undefined : 'category-name-error'}
              aria-invalid={fieldErrors.name !== undefined}
              autoFocus
              disabled={isSubmitting}
              id="category-name"
              maxLength={200}
              onChange={(event) => updateName(event.target.value)}
              placeholder="Enter category name"
              type="text"
              value={values.name}
            />
            {fieldErrors.name !== undefined && (
              <span className="field-error" id="category-name-error">{fieldErrors.name}</span>
            )}
          </div>

          <div className="catalog-field">
            <label htmlFor="category-code">Code</label>
            <input
              aria-describedby={fieldErrors.categoryCode === undefined
                ? 'category-code-help'
                : 'category-code-help category-code-error'}
              aria-invalid={fieldErrors.categoryCode !== undefined}
              autoCapitalize="characters"
              autoComplete="off"
              disabled={isSubmitting}
              id="category-code"
              maxLength={6}
              onChange={(event) => updateCode(event.target.value)}
              placeholder="FRT001"
              type="text"
              value={values.categoryCode}
            />
            <span className="field-help" id="category-code-help">
              Three letters followed by three digits.
            </span>
            {fieldErrors.categoryCode !== undefined && (
              <span className="field-error" id="category-code-error">
                {fieldErrors.categoryCode}
              </span>
            )}
          </div>
        </div>

        <label className="checkbox-field category-status-field">
          <input
            checked={values.isActive}
            disabled={isSubmitting}
            onChange={(event) => setValues((current) => ({
              ...current,
              isActive: event.target.checked,
            }))}
            type="checkbox"
          />
          Active and available for products
        </label>

        <div className="product-form-actions">
          <IconButton
            disabled={isSubmitting}
            icon={<X size={18} strokeWidth={1.8} />}
            label="Cancel"
            onClick={onCancel}
          />
          <IconButton
            disabled={isSubmitting}
            icon={isSubmitting
              ? <LoaderCircle className="icon-spin" size={18} strokeWidth={1.8} />
              : isEditing
                ? <Save size={18} strokeWidth={1.8} />
                : <Plus size={19} strokeWidth={1.8} />}
            label={isSubmitting
              ? isEditing ? 'Saving changes' : 'Adding category'
              : isEditing ? 'Save changes' : 'Add category'}
            type="submit"
            variant="primary"
          />
        </div>
      </form>
    </section>
  )
}
