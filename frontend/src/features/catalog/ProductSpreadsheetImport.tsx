import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { importProductsFromSpreadsheet } from './catalogApi.ts'
import {
  getSpreadsheetImportFailure,
  validateProductSpreadsheet,
} from './spreadsheetExchange.ts'
import type { SpreadsheetRowError } from './spreadsheetExchange.ts'

interface ProductSpreadsheetImportProps {
  onCancel: () => void
  onImported: (count: number) => void
}

export function ProductSpreadsheetImport({
  onCancel,
  onImported,
}: ProductSpreadsheetImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<SpreadsheetRowError[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null
    const validationError = selectedFile === null
      ? 'Choose a spreadsheet.'
      : validateProductSpreadsheet(selectedFile)

    setFile(selectedFile)
    setFileError(validationError ?? null)
    setFormError(null)
    setRowErrors([])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (file === null) {
      setFileError('Choose a spreadsheet.')
      return
    }

    const validationError = validateProductSpreadsheet(file)

    if (validationError !== undefined) {
      setFileError(validationError)
      return
    }

    setIsSubmitting(true)
    setFileError(null)
    setFormError(null)
    setRowErrors([])

    try {
      const result = await importProductsFromSpreadsheet(file)
      onImported(result.importedCount)
    } catch (error) {
      const failure = getSpreadsheetImportFailure(error)
      setFileError(failure.fileError)
      setFormError(failure.formError)
      setRowErrors(failure.rowErrors)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="management-panel" aria-labelledby="spreadsheet-import-title">
      <div className="management-heading">
        <div>
          <h2 id="spreadsheet-import-title">Import products</h2>
          <p>Add products from a completed Excel workbook.</p>
        </div>
      </div>

      <form className="spreadsheet-import-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {formError !== null && (
          <p className="alert alert-error" role="alert">{formError}</p>
        )}

        <div className="spreadsheet-file-field">
          <label htmlFor="product-spreadsheet">Choose spreadsheet</label>
          <input
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-describedby={fileError === null
              ? 'product-spreadsheet-help'
              : 'product-spreadsheet-help product-spreadsheet-error'}
            aria-invalid={fileError !== null}
            id="product-spreadsheet"
            onChange={handleFileChange}
            type="file"
          />
          <span className="field-help" id="product-spreadsheet-help">
            Excel workbook (.xlsx). Maximum size 10 MB.
          </span>
          {fileError !== null && (
            <span className="field-error" id="product-spreadsheet-error">{fileError}</span>
          )}
          {file !== null && fileError === null && (
            <span className="selected-file">Selected: {file.name}</span>
          )}
        </div>

        {rowErrors.length > 0 && <ImportErrors errors={rowErrors} />}

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
            disabled={isSubmitting || file === null || fileError !== null}
            type="submit"
          >
            {isSubmitting ? 'Importing...' : 'Import products'}
          </button>
        </div>
      </form>
    </section>
  )
}

function ImportErrors({ errors }: { errors: SpreadsheetRowError[] }) {
  return (
    <section className="import-errors" aria-labelledby="import-errors-title">
      <h3 id="import-errors-title">Correct these rows and try again</h3>
      <div className="product-table-scroll">
        <table className="product-table import-error-table">
          <caption>Spreadsheet rows that could not be imported</caption>
          <thead>
            <tr>
              <th scope="col">Row</th>
              <th scope="col">Field</th>
              <th scope="col">Issue</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((error, index) => (
              <tr key={`${error.rowNumber}-${error.field}-${index}`}>
                <td>{error.rowNumber}</td>
                <td>{error.field}</td>
                <td>{error.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
