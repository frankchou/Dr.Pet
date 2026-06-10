import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { VET_REFERENCE_SCOPE } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

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

// ─── demo mock ────────────────────────────────────────────────────────────────
// demo 帳號回固定示意配餐分析（不打 AI）。內容取自設計圖 diet-ai-analysis-* /
// 前端 diet/page.tsx 的降級 mock，結構與 AI 路徑回傳完全一致。
const DEMO_DIET_ANALYSIS: DietAnalysisResult = {
  score: 92,
  protein: 26,
  fat: 14,
  calciumPhosphorus: '1.1:1',
  moisture: 78,
  alerts: [
    { type: 'warning', message: '磷含量過高 (1.4%)' },
    { type: 'warning', message: '水分不足 (60%)' },
  ],
  expertComment: '學理分析示磷值達臨界，應增水代謝。同步官方通報無警示批次，請安心餵食。',
  swapRecommendations: [
    {
      session: 'morning',
      currentItem: '自然本色小型成犬 亮白無穀鮭魚',
      reason: '磷偏高恐傷腎',
      alternatives: [{ name: '健康低磷鮮燉罐', reason: '無膠特調控磷配比' }],
    },
    {
      session: 'evening',
      currentItem: '自然本色亮白無穀鮭魚',
      reason: '鈉偏高腎臟負擔',
      alternatives: [{ name: '黃金南瓜鮮蒸雞肉', reason: '鉀離子含量優防脫' }],
    },
  ],
  localStoreRecs: [
    { store: '全聯福利中心', productName: '大成安心手撕雞胸', suitabilityScore: 96, comment: '原型食物低磷高水' },
    { store: '寵物公園 (門市)', productName: '健康低磷鮮燉罐', suitabilityScore: 94, comment: '無膠特調控磷配比' },
    { store: '大樹寵物 (店面)', productName: '黃金南瓜鮮蒸雞肉', suitabilityScore: 91, comment: '鉀離子含量優防脫' },
  ],
  detailedReport: {
    nutritionStandard:
      '系統依據美國飼料品管協會 (AAFCO) 與美國國家科學研究委員會 (NRC) 的國際權威指引，將您配餐的數據統一轉換為「乾物質比 (Dry Matter Basis, DMB)」。藉此剔除水分干擾，客觀評估粗蛋白、脂肪、碳水化合物及微量元素，是否確實符合毛孩當前年齡階段之基礎需求。',
    hydration:
      '水分是預防泌尿道與腎臟疾病的關鍵。系統將依據毛孩體重精算每日基礎需水量，並比對當前配餐中的含水量（如乾糧與濕食的佔比），精準預估水分缺口，提醒您是否需要額外引導毛孩喝水。',
    dietaryRestrictions:
      '系統將嚴格為您的設定把關。自動比對配餐成分以攔截「已知過敏原」（如牛肉、雞肉、乳製品、大豆或特定穀物）；並針對不同疾病之特殊健康需求（如腎臟病需嚴控磷攝取、心臟病需低鈉、泌尿道結石需控鎂與鈣），進行數值超標預警，協助落實居家疾病飲食管理。',
    ingredientScience:
      '系統全數依據世界小動物獸醫醫學會 (WSAVA) 營養指南與臨床毒理學文獻進行中立標示。系統會提示配餐中的「非必要人工添加物或爭議性成分」（如特定化學防腐劑、人工色素），同時也標註具備科學實證的「機能性益生原料」（如 Omega-3 脂肪酸），提供您長期選購的客觀參考。',
    foodSafetyAlert:
      '系統定期對接 FDA (美國食品藥物管理局) 與 TFDA 等官方機構之公開資訊。若當前配餐中包含近期經官方通報為「預防性下架、重金屬超標或配方重大異動」之商品，系統將即時發出風險阻斷提示。',
    drugFoodInteraction:
      '若您在檔案中註記毛孩正處於特定藥物療程（如服用抗生素、利尿劑、甲狀腺藥物），系統將運算當前配餐中的特定營養素（如高濃度鈣離子）是否會產生化學螯合作用而降低藥效，輔助您適當錯開餵食時間（註：實際給藥指引請絕對遵從主治獸醫醫囑）。',
    calorieCalculation:
      '考量基礎代謝率會隨環境浮動，系統將結合在地氣象數據與您輸入的日活動量。如遇極端低溫需產熱，或長期活動量驟減時，系統將動態提出總熱量微調建議。',
    foodTransition:
      '系統自動追蹤新商品之「引入天數與餵食比例」。若偵測單次換食幅度過大，將依據獸醫常規換食指引發出潛在急性腸胃不適預警，並產出符合學理的「7 天漸進換食配比建議」，防範因突然換食造成的腸胃負擔。',
    logCorrelation:
      '結合獸醫臨床病理的時序特性，系統具備動態回溯功能。若您於日誌中記載腸胃異常（如軟便），系統將比對近 48 小時內的飲食變更；若為皮膚或淚腺狀態異常，則延伸溯源至近 14 天的成分疊加情形，提取潛在的飲食關聯數據供您與獸醫參考。',
  },
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

    // demo 帳號：回固定示意分析，不打 AI。
    if (isDemoUser(session)) {
      return NextResponse.json(DEMO_DIET_ANALYSIS)
    }

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
