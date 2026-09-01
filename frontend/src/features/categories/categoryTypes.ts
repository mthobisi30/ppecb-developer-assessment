export interface Category {
  categoryId: number
  name: string
  categoryCode: string
  isActive: boolean
  rowVersion: string
}

export interface CreateCategoryInput {
  name: string
  categoryCode: string
  isActive: boolean
}

export interface UpdateCategoryInput extends CreateCategoryInput {
  rowVersion: string
}
