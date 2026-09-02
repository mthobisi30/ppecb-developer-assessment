import { useEffect, useState } from 'react'
import {
  CircleCheck,
  CircleOff,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { IconButton } from '../../components/IconButton.tsx'
import { getCategories, updateCategory } from './categoryApi.ts'
import { CategoryForm } from './CategoryForm.tsx'
import {
  getCategoryActionError,
  sortCategories,
} from './categoryForm.ts'
import type { Category } from './categoryTypes.ts'

type CategoryAction =
  | { kind: 'create' }
  | { kind: 'edit'; category: Category }

export function CategoryPage() {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<CategoryAction | null>(null)
  const [busyCategoryId, setBusyCategoryId] = useState<number | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    void getCategories(controller.signal)
      .then((result) => setCategories(sortCategories(result)))
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError('Categories could not be loaded. Please try again.')
        }
      })

    return () => controller.abort()
  }, [requestVersion])

  function retry() {
    setCategories(null)
    setLoadError(null)
    setActionError(null)
    setRequestVersion((version) => version + 1)
  }

  function openAction(action: CategoryAction) {
    setActiveAction(action)
    setActionError(null)
    setSuccessMessage(null)
  }

  function handleSaved(category: Category) {
    const result = activeAction?.kind === 'create' ? 'added' : 'updated'

    setCategories((current) => sortCategories([
      ...(current ?? []).filter(
        (candidate) => candidate.categoryId !== category.categoryId,
      ),
      category,
    ]))
    setActiveAction(null)
    setActionError(null)
    setSuccessMessage(`${category.name} was ${result}.`)
  }

  async function toggleCategory(category: Category) {
    setBusyCategoryId(category.categoryId)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const updated = await updateCategory(category.categoryId, {
        name: category.name,
        categoryCode: category.categoryCode,
        isActive: !category.isActive,
        rowVersion: category.rowVersion,
      })
      setCategories((current) => current?.map((candidate) =>
        candidate.categoryId === updated.categoryId ? updated : candidate) ?? [])
      setSuccessMessage(
        `${updated.name} is now ${updated.isActive ? 'active' : 'inactive'}.`,
      )
    } catch (error) {
      setActionError(getCategoryActionError(error))
    } finally {
      setBusyCategoryId(null)
    }
  }

  return (
    <section className="category-page" aria-labelledby="category-title">
      <div className="catalog-heading">
        <div>
          <h1 id="category-title">Categories</h1>
          <p>Manage the categories available when adding products.</p>
        </div>
        {activeAction === null && (
          <IconButton
            icon={<Plus size={19} strokeWidth={1.8} />}
            label="Add category"
            onClick={() => openAction({ kind: 'create' })}
            variant="primary"
          />
        )}
      </div>

      {successMessage !== null && (
        <p className="alert alert-success catalog-alert" role="status">
          {successMessage}
        </p>
      )}
      {actionError !== null && (
        <div className="alert alert-error page-action-error" role="alert">
          <span>{actionError}</span>
          <IconButton
            icon={<RefreshCw size={17} strokeWidth={1.8} />}
            label="Reload categories"
            onClick={retry}
            variant="quiet"
          />
        </div>
      )}

      {activeAction?.kind === 'create' && (
        <CategoryForm
          onCancel={() => setActiveAction(null)}
          onSaved={handleSaved}
        />
      )}
      {activeAction?.kind === 'edit' && (
        <CategoryForm
          category={activeAction.category}
          onCancel={() => setActiveAction(null)}
          onSaved={handleSaved}
        />
      )}

      {activeAction === null && categories === null && loadError === null && (
        <CategoryLoading />
      )}
      {activeAction === null && loadError !== null && (
        <CategoryLoadError message={loadError} onRetry={retry} />
      )}
      {activeAction === null && categories?.length === 0 && <EmptyCategories />}
      {activeAction === null && categories !== null && categories.length > 0 && (
        <CategoryTable
          busyCategoryId={busyCategoryId}
          categories={categories}
          onEdit={(category) => openAction({ kind: 'edit', category })}
          onToggle={(category) => void toggleCategory(category)}
        />
      )}
    </section>
  )
}

function CategoryLoading() {
  return (
    <div className="catalog-state" aria-busy="true" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>Loading categories...</p>
    </div>
  )
}

interface CategoryLoadErrorProps {
  message: string
  onRetry: () => void
}

function CategoryLoadError({ message, onRetry }: CategoryLoadErrorProps) {
  return (
    <div className="catalog-state" role="alert">
      <h2>Unable to load categories</h2>
      <p>{message}</p>
      <IconButton
        icon={<RefreshCw size={18} strokeWidth={1.8} />}
        label="Try again"
        onClick={onRetry}
      />
    </div>
  )
}

function EmptyCategories() {
  return (
    <div className="catalog-state">
      <h2>No categories found</h2>
      <p>Add a category before creating products.</p>
    </div>
  )
}

interface CategoryTableProps {
  busyCategoryId: number | null
  categories: Category[]
  onEdit: (category: Category) => void
  onToggle: (category: Category) => void
}

function CategoryTable({
  busyCategoryId,
  categories,
  onEdit,
  onToggle,
}: CategoryTableProps) {
  return (
    <div className="category-results">
      <div className="product-table-scroll">
        <table className="product-table category-table">
          <caption>Categories available to the current account</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Code</th>
              <th scope="col">Status</th>
              <th className="actions-column" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.categoryId}>
                <td className="category-name">{category.name}</td>
                <td className="product-code">{category.categoryCode}</td>
                <td>
                  <span className={`status-label ${category.isActive
                    ? 'status-active'
                    : 'status-inactive'}`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="actions-column">
                  <div className="row-actions">
                    <IconButton
                      className="row-action-button"
                      disabled={busyCategoryId !== null}
                      icon={<Pencil size={17} strokeWidth={1.8} />}
                      label={`Edit ${category.name}`}
                      onClick={() => onEdit(category)}
                      tooltip="Edit category"
                    />
                    <IconButton
                      className="row-action-button"
                      disabled={busyCategoryId !== null}
                      icon={busyCategoryId === category.categoryId
                        ? <LoaderCircle className="icon-spin" size={17} strokeWidth={1.8} />
                        : category.isActive
                          ? <CircleOff size={17} strokeWidth={1.8} />
                          : <CircleCheck size={17} strokeWidth={1.8} />}
                      label={busyCategoryId === category.categoryId
                        ? `Updating ${category.name}`
                        : category.isActive
                          ? `Deactivate ${category.name}`
                          : `Activate ${category.name}`}
                      onClick={() => onToggle(category)}
                      tooltip={busyCategoryId === category.categoryId
                        ? 'Updating category'
                        : category.isActive ? 'Deactivate category' : 'Activate category'}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
