export interface Pet {
  id: string
  name: string
  species: string
  breed?: string | null
  sex: string
  birthday?: Date | string | null
  weight?: number | null
  isNeutered: boolean
  allergies?: string | null
  medicalHistory?: string | null
  mainProblems: string
  avatar?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  symptoms?: SymptomEntry[]
  productUsages?: ProductUsage[]
  documents?: Document[]
  insights?: AIInsight[]
  chatMessages?: ChatMessage[]
  weeklyTasks?: WeeklyTask[]
}

export interface SymptomEntry {
  id: string
  petId: string
  symptomType: string
  severity: number
  side?: string | null
  notes?: string | null
  photos: string
  createdAt: Date | string
}

export interface Product {
  id: string
  type: string
  name: string
  brand?: string | null
  variant?: string | null
  ingredientText?: string | null
  ingredientJson?: string | null
  photos: string
  createdAt: Date | string
  usages?: ProductUsage[]
}

export interface ProductUsage {
  id: string
  petId: string
  productId: string
  product?: Product
  date: Date | string
  frequency?: string | null
  amountLevel?: string | null
  notes?: string | null
  createdAt: Date | string
}

export interface Document {
  id: string
  petId: string
  type: string
  photos: string
  extractedText?: string | null
  extractedStructured?: string | null
  createdAt: Date | string
}

export interface AIInsight {
  id: string
  petId: string
  symptomType?: string | null
  suspectedTriggers: string
  helpfulFactors: string
  confidence: string
  rationale?: string | null
  recommendedActions: string
  createdAt: Date | string
}

export interface ChatMessage {
  id: string
  petId: string
  role: string
  content: string
  createdAt: Date | string
}

export interface WeeklyTask {
  id: string
  petId: string
  title: string
  description?: string | null
  completed: boolean
  dueDate?: Date | string | null
  createdAt: Date | string
}

export interface IngredientExtraction {
  ingredients: string[]
  protein_sources: string[]
  additives: string[]
  functional_ingredients: string[]
  raw_text: string
}

export interface InsightTrigger {
  name: string
  confidence: 'low' | 'medium' | 'high'
  basis: string
  action: string
}

export type NewsCategory = 'food_safety' | 'danger' | 'health'

export interface NewsArticle {
  id: string
  category: string
  subCategory?: string | null
  title: string
  summary: string
  sourceUrl?: string | null
  sourceName?: string | null
  publishedAt?: Date | string | null
  isUrgent: boolean
  // 食安警報涉及的廠商/品牌/產品關鍵詞（JSON string array），供個人化頭條比對
  affectedBrands?: string | null
  // 已觸發食安推播的時間戳，非 null = 已推
  foodAlertPushedAt?: Date | string | null
  createdAt: Date | string
}
