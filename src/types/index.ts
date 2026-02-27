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
