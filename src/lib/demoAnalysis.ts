// demo 帳號的固定示意成分綜合分析結果（不執行規則式分析、不打 AI）。
//
// 設計原則（frank 拍板）：demo 帳號的所有分析功能一律回固定 mock，
// 回應穩定、可重現。/api/analysis 雖為規則式（不打 AI），仍依「demo 全 mock」
// 原則回此固定結果。結構與 GET /api/analysis 正常路徑回傳的 body 完全一致。

import type { MatchedIngredient, SupplementRecommendation } from './ingredientAnalyzer'

interface NutritionalFact {
  name: string
  value: number
  unit: string
}

interface ProductNutrition {
  productId: string
  productName: string
  facts: NutritionalFact[]
}

interface AnalysisResultShape {
  matched: MatchedIngredient[]
  toxicItems: MatchedIngredient[]
  warningItems: MatchedIngredient[]
  cautionItems: MatchedIngredient[]
  safeItems: MatchedIngredient[]
  supplements: SupplementRecommendation[]
  analyzedProducts: Array<{ id: string; name: string; brand: string | null; type: string; ingredientCount: number }>
  stats: {
    totalIngredients: number
    toxicCount: number
    warningCount: number
    cautionCount: number
    safeCount: number
  }
}

interface DemoAnalysisShape {
  pet: { id: string; name: string; species: string; weight: number | null; avatar: string | null }
  result: AnalysisResultShape
  nutritionByProduct: ProductNutrition[]
  analyzedAt: string
}

// 兩款示意產品（與替代品推薦的 forProduct 對得起來）
const DEMO_PRODUCTS = [
  { id: 'demo-prod-1', name: '雞肉鮮蔬成犬糧', brand: '黃金牧場', type: 'food', ingredientCount: 6 },
  { id: 'demo-prod-2', name: '鮪魚白身罐 80g', brand: '海岸鮮燉', type: 'food', ingredientCount: 4 },
] as const

const PROD1 = '黃金牧場 雞肉鮮蔬成犬糧'
const PROD2 = '海岸鮮燉 鮪魚白身罐 80g'

const cautionItems: MatchedIngredient[] = [
  {
    displayName: '雞肉',
    patterns: ['雞肉'],
    category: 'protein',
    riskLevel: 'caution',
    effect: '常見蛋白質來源，消化吸收良好。但雞肉為常見過敏原，部分犬貓長期食用後可能引發淚痕增加、皮膚搔癢。',
    symptoms: ['tear', 'skin'],
    foundIn: [PROD1],
    rawText: '雞肉',
  },
]

const warningItems: MatchedIngredient[] = [
  {
    displayName: '鹽（鈉）',
    patterns: ['鹽', '鈉'],
    category: 'mineral',
    riskLevel: 'warning',
    effect: '罐頭常見鈉偏高，長期過量增加心血管與腎臟負擔，腎病或心臟病毛孩需特別留意。',
    symptoms: [],
    foundIn: [PROD2],
    rawText: '鹽',
  },
]

const safeItems: MatchedIngredient[] = [
  {
    displayName: '南瓜',
    patterns: ['南瓜'],
    category: 'fiber',
    riskLevel: 'safe',
    effect: '富含膳食纖維，有助腸道蠕動與糞便成形。',
    symptoms: ['digestive'],
    foundIn: [PROD1],
    rawText: '南瓜',
  },
  {
    displayName: '鮪魚',
    patterns: ['鮪魚'],
    category: 'protein',
    riskLevel: 'safe',
    effect: '優質動物性蛋白，富含 Omega-3，有助皮膚與被毛健康。',
    symptoms: ['skin'],
    foundIn: [PROD2],
    rawText: '鮪魚',
  },
]

const supplements: SupplementRecommendation[] = [
  {
    name: 'Omega-3 魚油',
    symptomTriggers: ['skin', 'tear'],
    missingPatterns: ['魚油', 'omega-3'],
    reason: '配餐中 Omega-3 來源偏少，補充可協助緩解皮膚搔癢與淚痕問題。',
    priority: 'medium',
    examples: '深海魚油、磷蝦油',
    triggered: true,
  },
]

export const DEMO_ANALYSIS: DemoAnalysisShape = {
  pet: { id: 'demo-pet', name: '小白', species: '狗', weight: 8, avatar: null },
  result: {
    matched: [...cautionItems, ...warningItems, ...safeItems],
    toxicItems: [],
    warningItems,
    cautionItems,
    safeItems,
    supplements,
    analyzedProducts: DEMO_PRODUCTS.map(p => ({ ...p })),
    stats: {
      totalIngredients: cautionItems.length + warningItems.length + safeItems.length,
      toxicCount: 0,
      warningCount: warningItems.length,
      cautionCount: cautionItems.length,
      safeCount: safeItems.length,
    },
  },
  nutritionByProduct: [
    {
      productId: 'demo-prod-1',
      productName: PROD1,
      // demo 示意值（mock）：補齊粗纖維、水分，使營養表 7 項標準營養素皆有資料
      facts: [
        { name: '粗蛋白', value: 26, unit: '%' },
        { name: '粗脂肪', value: 14, unit: '%' },
        { name: '粗纖維', value: 3, unit: '%' },
        { name: '水分', value: 10, unit: '%' },
        { name: '鈣', value: 1.3, unit: '%' },
        { name: '磷', value: 1.0, unit: '%' },
      ],
    },
    {
      productId: 'demo-prod-2',
      productName: PROD2,
      // demo 示意值（mock）：罐頭水分高，補齊水分、粗纖維示意
      facts: [
        { name: '粗蛋白', value: 12, unit: '%' },
        { name: '粗纖維', value: 1, unit: '%' },
        { name: '水分', value: 72, unit: '%' },
        { name: '鈉', value: 0.6, unit: '%' },
        { name: '磷', value: 0.7, unit: '%' },
      ],
    },
  ],
  analyzedAt: '2026-06-10T00:00:00.000Z',
}
