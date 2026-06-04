import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { VET_REFERENCE_SCOPE } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

// ─── 型別 ────────────────────────────────────────────────────────────────────

interface RequestItem {
  session: string
  customName?: string
  productName?: string
  quantity: number
  unit: string
  tags: string[]
}

interface PetInfo {
  name: string
  species: string
  breed?: string
  weight?: number
  mainProblems: string[]
  allergies: string[]
}

interface DietAnalysisRequestBody {
  petId: string
  planId: string
  items: RequestItem[]
  petInfo: PetInfo
}

interface Alert {
  type: 'warning' | 'danger'
  message: string
}

interface SwapAlternative {
  name: string
  reason: string
}

interface SwapRecommendation {
  session: string
  currentItem: string
  reason: string
  alternatives: SwapAlternative[]
}

interface LocalStoreRec {
  store: string
  productName: string
  suitabilityScore: number
  comment: string
}

interface DetailedReport {
  nutritionStandard: string
  hydration: string
  dietaryRestrictions: string
  ingredientScience: string
  foodSafetyAlert: string
  drugFoodInteraction: string
  calorieCalculation: string
  foodTransition: string
  logCorrelation: string
}

export interface DietAnalysisResult {
  score: number
  protein: number
  fat: number
  calciumPhosphorus: string
  moisture: number
  alerts: Alert[]
  expertComment: string
  swapRecommendations: SwapRecommendation[]
  localStoreRecs: LocalStoreRec[]
  detailedReport: DetailedReport
}

// ─── 工具函式 ─────────────────────────────────────────────────────────────────

function sessionLabel(session: string): string {
  const map: Record<string, string> = {
    morning: '晨間',
    noon: '午間',
    evening: '晚間',
  }
  return map[session] ?? session
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as DietAnalysisRequestBody
    const { petId, planId, items, petInfo } = body

    if (!petId || !planId || !items || !petInfo) {
      return NextResponse.json({ error: 'petId, planId, items, petInfo 為必填' }, { status: 400 })
    }

    // AI route：先驗權限再呼叫 anthropic，避免無權者燒 token
    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (items.length === 0) {
      return NextResponse.json(
        { error: '請先新增配餐項目再進行 AI 分析' },
        { status: 422 }
      )
    }

    // 整理配餐清單文字
    const itemsText = items.map(it => {
      const name = it.productName ?? it.customName ?? '未命名'
      const tags = it.tags.length > 0 ? `（${it.tags.join('、')}）` : ''
      return `- 【${sessionLabel(it.session)}】${name} ${it.quantity}${it.unit}${tags}`
    }).join('\n')

    // 整理寵物資訊文字
    const petText = [
      `名字：${petInfo.name}`,
      `物種：${petInfo.species}`,
      petInfo.breed ? `品種：${petInfo.breed}` : null,
      petInfo.weight ? `體重：${petInfo.weight} kg` : null,
      `主要健康問題：${petInfo.mainProblems.length > 0 ? petInfo.mainProblems.join('、') : '無'}`,
      `已知過敏原：${petInfo.allergies.length > 0 ? petInfo.allergies.join('、') : '無'}`,
    ].filter(Boolean).join('\n')

    const prompt = `你是獸醫營養師，請分析以下寵物今日配餐並以 JSON 格式回傳結果。

寵物資訊：
${petText}

今日配餐：
${itemsText}

請回傳以下 JSON 結構（不要加 markdown code block，直接回傳純 JSON）：
{
  "score": number,
  "protein": number,
  "fat": number,
  "calciumPhosphorus": string,
  "moisture": number,
  "alerts": [
    { "type": "warning" | "danger", "message": string }
  ],
  "expertComment": string,
  "swapRecommendations": [
    {
      "session": string,
      "currentItem": string,
      "reason": string,
      "alternatives": [{ "name": string, "reason": string }]
    }
  ],
  "localStoreRecs": [
    {
      "store": string,
      "productName": string,
      "suitabilityScore": number,
      "comment": string
    }
  ],
  "detailedReport": {
    "nutritionStandard": string,
    "hydration": string,
    "dietaryRestrictions": string,
    "ingredientScience": string,
    "foodSafetyAlert": string,
    "drugFoodInteraction": string,
    "calorieCalculation": string,
    "foodTransition": string,
    "logCorrelation": string
  }
}

欄位說明：
- score：0-100 綜合評分
- protein：蛋白質佔比 %（乾物質基準估算）
- fat：脂肪佔比 %
- calciumPhosphorus：鈣磷比字串，如 "1.2:1"
- moisture：含水量 %
- alerts：關鍵警示，type 只能是 "warning" 或 "danger"
- expertComment：AI 專家點評，2-3 句，繁體中文
- swapRecommendations：建議可替換的配餐品項，session 使用原始英文值（morning/noon/evening）
- localStoreRecs：台灣實體通路（全聯福利中心、寵物公園、特力屋寵物區等）推薦商品
- detailedReport：9大項目詳細報告，各以 2-4 句繁體中文說明

${VET_REFERENCE_SCOPE}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('AI 回傳非文字格式')
    }

    // 清理並解析 JSON
    const cleaned = content.text
      .replace(/```(?:json)?\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // 嘗試提取 JSON 物件
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('AI 回應無法識別為 JSON 格式')
    }

    let result: DietAnalysisResult
    try {
      result = JSON.parse(match[0]) as DietAnalysisResult
    } catch {
      throw new Error('AI 回應 JSON 格式解析失敗')
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/diet-analysis error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'

    if (msg.includes('credit balance') || msg.includes('insufficient_quota')) {
      return NextResponse.json(
        { error: 'AI 服務餘額不足，請至 console.anthropic.com 加值後再試。' },
        { status: 402 }
      )
    }
    if (msg.includes('API key')) {
      return NextResponse.json({ error: 'API Key 未設定' }, { status: 401 })
    }
    return NextResponse.json({ error: `分析失敗：${msg}` }, { status: 500 })
  }
}
