// 成分分析引擎
// 根據知識庫即時比對，不需要 AI API

import {
  INGREDIENT_KNOWLEDGE,
  SUPPLEMENT_RULES,
  type IngredientInfo,
  type SupplementRule,
} from './ingredientKnowledge'
import { parseJson } from './utils'

export interface MatchedIngredient extends IngredientInfo {
  foundIn: string[]   // 哪些產品裡有此成分
  rawText: string     // 原始比對到的文字
}

export interface SupplementRecommendation extends SupplementRule {
  triggered: boolean
}

export interface IngredientAnalysisResult {
  // 比對到的成分，依風險排序
  matched: MatchedIngredient[]
  // 有害成分（特別標出）
  toxicItems: MatchedIngredient[]
  // 警示成分
  warningItems: MatchedIngredient[]
  // 需注意成分
  cautionItems: MatchedIngredient[]
  // 安全成分
  safeItems: MatchedIngredient[]
  // 補充建議
  supplements: SupplementRecommendation[]
  // 所有分析到的產品
  analyzedProducts: ProductSummary[]
  // 統計
  stats: {
    totalIngredients: number
    toxicCount: number
    warningCount: number
    cautionCount: number
    safeCount: number
  }
}

export interface ProductSummary {
  id: string
  name: string
  brand: string | null
  type: string
  ingredientCount: number
}

interface ProductData {
  id: string
  name: string
  brand: string | null
  type: string
  ingredientText: string | null
  ingredientJson: string | null
}

// 從產品資料中提取所有成分文字
function extractIngredientTexts(product: ProductData): string[] {
  const texts: string[] = []

  // 1. 嘗試從 JSON 結構提取
  if (product.ingredientJson) {
    const json = parseJson<{
      ingredients?: string[]
      protein_sources?: string[]
      additives?: string[]
      functional_ingredients?: string[]
    }>(product.ingredientJson, {})

    const allArrays = [
      ...(json.ingredients || []),
      ...(json.protein_sources || []),
      ...(json.additives || []),
      ...(json.functional_ingredients || []),
    ]
    texts.push(...allArrays)
  }

  // 2. 原始文字：只在沒有結構化資料時才使用（避免「不含X」等否定句誤判）
  if (texts.length === 0 && product.ingredientText) {
    texts.push(product.ingredientText)
  }

  return texts
}

// 正規化文字（小寫、移除空白）
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '').replace(/[()（）]/g, '')
}

// 比對單一成分知識條目是否出現在文字中
function matchKnowledge(
  info: IngredientInfo,
  ingredientTexts: string[]
): { matched: boolean; rawText: string } {
  const combinedText = normalize(ingredientTexts.join(' '))
  for (const pattern of info.patterns) {
    const normalizedPattern = normalize(pattern)
    if (combinedText.includes(normalizedPattern)) {
      // 找到原始比對文字
      const rawMatch = ingredientTexts.find((t) =>
        normalize(t).includes(normalizedPattern)
      )
      return { matched: true, rawText: rawMatch || pattern }
    }
  }
  return { matched: false, rawText: '' }
}

// 主要分析函式
export function analyzeIngredients(
  products: ProductData[],
  petSymptoms: string[] = [],   // 寵物的症狀類型清單
  petSpecies: string = '犬'
): IngredientAnalysisResult {
  // 收集每個產品的成分文字
  const productIngredientMap = new Map<string, string[]>()
  const productSummaries: ProductSummary[] = []

  for (const product of products) {
    const texts = extractIngredientTexts(product)
    productIngredientMap.set(product.id, texts)
    productSummaries.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      type: product.type,
      ingredientCount: texts.length,
    })
  }

  // 所有成分文字合集（用於補充建議比對）
  const allTexts: string[] = []
  for (const texts of productIngredientMap.values()) {
    allTexts.push(...texts)
  }

  // 比對知識庫
  const matched: MatchedIngredient[] = []

  for (const info of INGREDIENT_KNOWLEDGE) {
    // 貓咪跳過某些只針對狗的規則（牛磺酸對貓尤其重要，已在知識庫標記）
    const foundInProducts: string[] = []
    let foundRawText = ''

    for (const product of products) {
      const texts = productIngredientMap.get(product.id) || []
      const result = matchKnowledge(info, texts)
      if (result.matched) {
        foundInProducts.push(`${product.brand ? product.brand + ' ' : ''}${product.name}`)
        if (!foundRawText) foundRawText = result.rawText
      }
    }

    if (foundInProducts.length > 0) {
      matched.push({
        ...info,
        foundIn: foundInProducts,
        rawText: foundRawText,
      })
    }
  }

  // 分類
  const toxicItems = matched.filter((i) => i.riskLevel === 'toxic')
  const warningItems = matched.filter((i) => i.riskLevel === 'warning')
  const cautionItems = matched.filter((i) => i.riskLevel === 'caution')
  const safeItems = matched.filter((i) => i.riskLevel === 'safe')

  // 計算補充建議
  const supplements: SupplementRecommendation[] = []
  for (const rule of SUPPLEMENT_RULES) {
    // 貓咪牛磺酸規則不需要症狀觸發
    const symptomMatch =
      rule.symptomTriggers.length === 0 ||
      rule.symptomTriggers.some((s) => petSymptoms.includes(s))

    if (!symptomMatch) continue

    // 貓咪跳過不適用的規則
    if (petSpecies === '貓' && rule.name === '葡萄糖胺 + 軟骨素' && !petSymptoms.includes('joint')) continue

    // 檢查是否已有此成分
    const alreadyHas = rule.missingPatterns.some((p) =>
      normalize(allTexts.join(' ')).includes(normalize(p))
    )

    supplements.push({
      ...rule,
      triggered: !alreadyHas, // 缺少時才觸發
    })
  }

  const activeSupplements = supplements.filter((s) => s.triggered)
  // 補充建議按優先度排序
  activeSupplements.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  return {
    matched,
    toxicItems,
    warningItems,
    cautionItems,
    safeItems,
    supplements: activeSupplements,
    analyzedProducts: productSummaries,
    stats: {
      totalIngredients: matched.length,
      toxicCount: toxicItems.length,
      warningCount: warningItems.length,
      cautionCount: cautionItems.length,
      safeCount: safeItems.length,
    },
  }
}
