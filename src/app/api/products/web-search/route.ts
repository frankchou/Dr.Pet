// AI 搜尋寵物食品：使用 Claude 搜尋網路取得真實產品資訊

import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { analyzeIngredients } from '@/lib/ingredientAnalyzer'
import { prisma } from '@/lib/prisma'
import { parseJson } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

interface WebProduct {
  name: string
  brand: string
  type: string
  description: string
  ingredients: string[]
  is_from_web: boolean
  cautionCount: number
  warningCount: number
  toxicCount: number
  safeCount: number
}

// 詳細模式（detailed:true）下，AI 一併抓回的完整產品資料與風險判定。
// 對應設計圖 diet-add-item-detail-info-1/2 的展開內容，以及 risk-1/2 的兩種風險樣式。
// 任一欄位都可能缺漏（AI 找不到時降級），UI 需容忍 null / 空陣列。
export interface NutrientRow {
  label: string
  value: string
}

export interface FeedingGuideRow {
  weight: string   // 體重（kg）
  amount: string   // 每日餵食量（g）
}

export interface ProductDetail {
  variant: string | null            // 規格（例：1.5kg / 60粒/瓶）
  ingredientSummary: string | null  // 完整成分資訊（與包裝一致）摘要
  fullIngredients: string | null    // 展開：完整成分
  nutritionalAdditives: string | null // 展開：營養添加物（每公斤）
  nutritionFacts: NutrientRow[]     // 展開：營養成分表
  caloriePerKg: string | null       // 熱量（千卡/公斤）
  spec: NutrientRow[]               // 商品規格（適用年齡/產地/功能…）
  manufacturing: NutrientRow[]      // 製造與代理資訊
  feedingGuide: FeedingGuideRow[]   // 每日建議餵食量
  certifications: string[]          // 驗證標章（ISO 22000 / AAFCO / FEDIAF / IFOS…）
  dataSources: string[]             // AI 驗證數據出處
  dataUpdatedAt: string | null      // 數據更新日期
}

// 風險判定：none = 無風險；product = 樣式A（本品有風險）；brand = 樣式B（品牌警示）
export type RiskStyle = 'none' | 'product' | 'brand'

export interface RiskInfo {
  style: RiskStyle
  // 樣式A：風險說明文字
  productRiskText: string | null
  // 樣式B：品牌警示橫幅文字（例：「多項產品未通過核可」）
  brandWarningText: string | null
}

export interface WebProductDetailed extends WebProduct {
  detail: ProductDetail
  risk: RiskInfo
}

// demo 帳號一般（非 detailed）搜尋的固定示意產品清單（不打 AI / 不打 web_search）。
// 結構與一般模式回傳的 WebProduct 完全一致；風險計數取代表性數值。
const DEMO_GENERAL_PRODUCTS: WebProduct[] = [
  {
    name: '自然森林 無穀深海鮭魚全齡犬糧',
    brand: '自然森林',
    type: 'feed',
    description: '以單一動物性蛋白鮭魚為主、無穀低敏的全齡犬乾糧。',
    ingredients: ['去骨鮭魚', '鮭魚粉', '馬鈴薯', '豌豆', '鮭魚油', '亞麻仁籽', '牛磺酸'],
    is_from_web: true,
    cautionCount: 0,
    warningCount: 0,
    toxicCount: 0,
    safeCount: 7,
  },
  {
    name: '黃金牧場 雞肉鮮蔬成犬糧',
    brand: '黃金牧場',
    type: 'feed',
    description: '以雞肉為主要蛋白來源、添加蔬果的成犬日常乾糧。',
    ingredients: ['雞肉', '雞肉粉', '糙米', '燕麥', '玉米', '雞脂', '乾燥蔬菜'],
    is_from_web: true,
    cautionCount: 1,
    warningCount: 1,
    toxicCount: 0,
    safeCount: 5,
  },
  {
    name: '海岸鮮燉 鮪魚白身罐 80g',
    brand: '海岸鮮燉',
    type: 'wet',
    description: '高含水量的鮪魚主食罐，適合補水。',
    ingredients: ['鮪魚', '白身魚', '魚高湯', '葵花油', '維生素E', '牛磺酸'],
    is_from_web: true,
    cautionCount: 0,
    warningCount: 0,
    toxicCount: 0,
    safeCount: 6,
  },
]

// demo 帳號詳細搜尋的固定示意產品清單（不打 AI）。內容對應設計圖
// diet-add-item-ai-search / detail-info / risk 系列：含完整成分、營養表、標章、
// 兩種風險樣式（product / brand）。結構與 handleDetailedSearch 回傳完全一致。
const DEMO_DETAILED_PRODUCTS: WebProductDetailed[] = [
  {
    name: '自然森林 無穀深海鮭魚全齡犬糧',
    brand: '自然森林',
    type: 'feed',
    description: '以單一動物性蛋白鮭魚為主、無穀低敏的全齡犬乾糧。',
    ingredients: [
      '去骨鮭魚', '鮭魚粉', '馬鈴薯', '豌豆', '雞脂（混合生育醇保存）',
      '鮭魚油', '亞麻仁籽', '乾燥甜菜漿', '氯化鉀', '牛磺酸', '維生素與礦物質',
    ],
    is_from_web: true,
    cautionCount: 1,
    warningCount: 0,
    toxicCount: 0,
    safeCount: 9,
    detail: {
      variant: '1.5kg / 6kg',
      ingredientSummary: '單一動物性蛋白（鮭魚）配方，無小麥、玉米、大豆等常見穀物，添加 Omega-3。',
      fullIngredients:
        '去骨鮭魚、鮭魚粉、馬鈴薯、豌豆、雞脂（以混合生育醇保存）、鮭魚油、亞麻仁籽、乾燥甜菜漿、氯化鉀、牛磺酸、綜合維生素與礦物質。',
      nutritionalAdditives: '維生素A 15,000 IU/kg、維生素D3 1,000 IU/kg、維生素E 150 mg/kg、鋅 120 mg/kg、硒 0.3 mg/kg。',
      nutritionFacts: [
        { label: '粗蛋白', value: '26%' },
        { label: '粗脂肪', value: '15%' },
        { label: '粗纖維', value: '3.5%' },
        { label: '水分', value: '10%' },
        { label: 'Omega-3', value: '0.9%' },
      ],
      caloriePerKg: '3,650 千卡/公斤',
      spec: [
        { label: '適用年齡', value: '全齡犬' },
        { label: '產地', value: '加拿大' },
        { label: '功能', value: '皮膚毛髮 / 低敏' },
      ],
      manufacturing: [
        { label: '製造商', value: 'Nature Forest Pet Foods Inc.' },
        { label: '進口代理', value: '森活寵物有限公司' },
      ],
      feedingGuide: [
        { weight: '5公斤', amount: '90-110克/日' },
        { weight: '10公斤', amount: '150-180克/日' },
        { weight: '20公斤', amount: '255-300克/日' },
      ],
      certifications: ['ISO 22000', 'AAFCO', 'HACCP'],
      dataSources: ['原廠官網', '寵物食品申報網'],
      dataUpdatedAt: '2026-05-20',
    },
    risk: {
      style: 'none',
      productRiskText: null,
      brandWarningText: null,
    },
  },
  {
    name: '黃金牧場 雞肉鮮蔬成犬糧',
    brand: '黃金牧場',
    type: 'feed',
    description: '以雞肉為主要蛋白來源、添加蔬果的成犬日常乾糧。',
    ingredients: [
      '雞肉', '雞肉粉', '糙米', '燕麥', '玉米', '雞脂', '乾燥蔬菜', '鹽',
      '綜合維生素', '綜合礦物質',
    ],
    is_from_web: true,
    cautionCount: 1,
    warningCount: 1,
    toxicCount: 0,
    safeCount: 8,
    detail: {
      variant: '2kg / 7kg',
      ingredientSummary: '雞肉與全穀（糙米、燕麥）配方，含蔬果纖維。含雞肉與玉米，過敏體質需留意。',
      fullIngredients:
        '雞肉、雞肉粉、糙米、燕麥、玉米、雞脂、乾燥蔬菜（胡蘿蔔、菠菜）、鹽、綜合維生素、綜合礦物質。',
      nutritionalAdditives: '維生素A 12,000 IU/kg、維生素E 120 mg/kg、鋅 100 mg/kg。',
      nutritionFacts: [
        { label: '粗蛋白', value: '24%' },
        { label: '粗脂肪', value: '12%' },
        { label: '粗纖維', value: '4%' },
        { label: '水分', value: '10%' },
      ],
      caloriePerKg: '3,480 千卡/公斤',
      spec: [
        { label: '適用年齡', value: '成犬' },
        { label: '產地', value: '台灣' },
        { label: '功能', value: '日常維持' },
      ],
      manufacturing: [
        { label: '製造商', value: '黃金牧場食品股份有限公司' },
        { label: '進口代理', value: '（國產）' },
      ],
      feedingGuide: [
        { weight: '5公斤', amount: '95-115克/日' },
        { weight: '10公斤', amount: '160-190克/日' },
      ],
      certifications: ['ISO 22000', 'HACCP'],
      dataSources: ['原廠官網', '食藥署食品藥物消費者知識服務網'],
      dataUpdatedAt: '2026-04-15',
    },
    risk: {
      style: 'product',
      productRiskText: '此配方含雞肉與玉米，若毛孩對禽類或玉米蛋白過敏，可能加重皮膚搔抓或腸胃不適，建議謹慎少量試用並觀察反應。',
      brandWarningText: null,
    },
  },
  {
    name: '海岸鮮燉 鮪魚白身罐 80g',
    brand: '海岸鮮燉',
    type: 'wet',
    description: '高含水量的鮪魚主食罐，適合補水。',
    ingredients: ['鮪魚', '白身魚', '魚高湯', '葵花油', '維生素E', '牛磺酸'],
    is_from_web: true,
    cautionCount: 0,
    warningCount: 0,
    toxicCount: 0,
    safeCount: 6,
    detail: {
      variant: '80g/罐',
      ingredientSummary: '鮪魚與白身魚為主的主食濕罐，含水量高，有助日常補水。',
      fullIngredients: '鮪魚、白身魚、魚高湯、葵花油、維生素E、牛磺酸。',
      nutritionalAdditives: '維生素E 30 mg/罐、牛磺酸 0.1%。',
      nutritionFacts: [
        { label: '粗蛋白', value: '14%' },
        { label: '粗脂肪', value: '1.5%' },
        { label: '水分', value: '82%' },
      ],
      caloriePerKg: '780 千卡/公斤',
      spec: [
        { label: '適用對象', value: '全齡犬貓' },
        { label: '產地', value: '泰國' },
        { label: '功能', value: '補水 / 主食罐' },
      ],
      manufacturing: [
        { label: '製造商', value: 'Coastal Stew Co., Ltd.' },
        { label: '進口代理', value: '海岸寵物食品行' },
      ],
      feedingGuide: [
        { weight: '5公斤', amount: '1.5-2罐/日' },
        { weight: '10公斤', amount: '2.5-3罐/日' },
      ],
      certifications: ['HACCP', 'IFOS'],
      dataSources: ['原廠官網'],
      dataUpdatedAt: '2026-03-30',
    },
    risk: {
      style: 'brand',
      productRiskText: null,
      brandWarningText: '此品牌部分批次曾經官方通報重金屬檢驗，選購時建議確認批號與最新檢驗報告。',
    },
  },
]

export async function POST(request: NextRequest) {
  try {
    let body: { query: string; petId?: string; detailed?: boolean; category?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
    }

    const { query, petId, detailed, category } = body
    if (!query?.trim()) return NextResponse.json({ products: [] })

    const session = await auth()

    // demo 帳號：詳細 / 一般模式皆回固定示意產品清單，不打 AI / web_search。
    if (isDemoUser(session)) {
      return NextResponse.json({
        products: detailed ? DEMO_DETAILED_PRODUCTS : DEMO_GENERAL_PRODUCTS,
      })
    }

    // 取得寵物資訊：帶 petId 時需先驗權限，無權限就忽略 petId 降級為一般搜尋
    // （避免破壞未綁寵物的正常用法，同時擋住用他人 petId 讀取寵物資料的 IDOR）
    let petSymptoms: string[] = []
    let petSpecies = '犬'
    let petAllergies: string[] = []
    let petMainProblems: string[] = []
    let allowedPetId: string | null = null
    if (petId) {
      const access = await requirePetAccess(petId, session?.user?.id ?? '')
      if (access.ok) allowedPetId = petId
    }
    if (allowedPetId) {
      const pet = await prisma.pet.findUnique({
        where: { id: allowedPetId },
        select: { species: true, mainProblems: true, allergies: true },
      })
      if (pet) {
        petSpecies = pet.species
        petMainProblems = parseJson<string[]>(pet.mainProblems, [])
        petAllergies = parseJson<string[]>(pet.allergies ?? '[]', [])
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const recent = await prisma.symptomEntry.findMany({
          where: { petId: allowedPetId, createdAt: { gte: thirtyDaysAgo } },
          select: { symptomType: true },
        })
        petSymptoms = [...new Set([...petMainProblems, ...recent.map(s => s.symptomType)])]
      }
    }

    // 詳細模式：AI 一併抓回完整產品資料 + 依該毛孩健康狀態判定風險（設計圖 detail-info / risk 系列）
    if (detailed) {
      return await handleDetailedSearch(query, category, petSpecies, petSymptoms, petAllergies, petMainProblems)
    }

    const prompt = `你是寵物食品專家。請搜尋「${query}」這個寵物食品或用品，找出真實存在的產品資料。

請回傳 JSON 格式（不含 markdown code block）：
{
  "products": [
    {
      "name": "完整產品名稱",
      "brand": "品牌名稱",
      "type": "feed|snack|supplement|wet|dental|shampoo|other",
      "description": "一句話描述此產品",
      "ingredients": ["成分1", "成分2", "成分3", "...（盡量完整列出主要成分）"]
    }
  ]
}

規則：
- 最多回傳 3 個最相關的產品
- 成分請用繁體中文
- type 只能是 feed/snack/supplement/wet/dental/shampoo/other 其中之一
- 如果不確定成分，根據產品類型給出常見成分估計，但要標示 is_estimate: true
- 只回傳有可能真實存在的產品`

    // 使用 web_search 工具讓 Claude 搜尋網路
    type ContentBlock = { type: string; text?: string }
    const messagesParam: Parameters<typeof anthropic.messages.create>[0]['messages'] = [
      { role: 'user', content: prompt }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305' as never, name: 'web_search' }],
      messages: messagesParam,
    })

    // 處理多輪（web search 可能需要多輪）
    let currentResponse = response
    let rounds = 0
    const maxRounds = 3

    while (currentResponse.stop_reason === 'tool_use' && rounds < maxRounds) {
      rounds++
      const toolUseBlocks = currentResponse.content.filter(b => b.type === 'tool_use') as Array<{ type: 'tool_use'; id: string; name: string; input: unknown }>
      const allMessages = [
        ...messagesParam,
        { role: 'assistant' as const, content: currentResponse.content },
        {
          role: 'user' as const,
          content: toolUseBlocks.map(block => ({
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: '已執行搜尋，請根據結果回答。',
          })),
        },
      ]

      currentResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305' as never, name: 'web_search' }],
        messages: allMessages,
      })
    }

    const textBlock = currentResponse.content.find(b => b.type === 'text') as (ContentBlock & { text: string }) | undefined
    if (!textBlock) return NextResponse.json({ products: [] })

    const cleaned = textBlock.text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = parseJson<{ products: Array<{ name: string; brand: string; type: string; description: string; ingredients: string[] }> }>(
      cleaned, { products: [] }
    )

    // 對每個產品做成分風險分析
    const products: WebProduct[] = parsed.products.map(prod => {
      const mockProduct = {
        id: '__web__',
        name: prod.name,
        brand: prod.brand || null,
        type: prod.type || 'other',
        ingredientText: null,
        ingredientJson: JSON.stringify({ ingredients: prod.ingredients || [] }),
      }
      const analysis = analyzeIngredients([mockProduct], petSymptoms, petSpecies)
      return {
        ...prod,
        is_from_web: true,
        cautionCount: analysis.stats.cautionCount,
        warningCount: analysis.stats.warningCount,
        toxicCount:   analysis.stats.toxicCount,
        safeCount:    analysis.stats.safeCount,
      }
    })

    return NextResponse.json({ products })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('web-search error:', e)
    return NextResponse.json({ error: msg, products: [] }, { status: 500 })
  }
}

// ─── 詳細模式 ─────────────────────────────────────────────────────────────────
// AI 搜尋產品並一併抓回完整資料（供卡片展開）+ 依毛孩健康狀態判定風險樣式。
// AI 解析失敗時降級回傳基本資料（detail 多為 null、risk.style = 'none'），UI 容忍。

const EMPTY_DETAIL: ProductDetail = {
  variant: null,
  ingredientSummary: null,
  fullIngredients: null,
  nutritionalAdditives: null,
  nutritionFacts: [],
  caloriePerKg: null,
  spec: [],
  manufacturing: [],
  feedingGuide: [],
  certifications: [],
  dataSources: [],
  dataUpdatedAt: null,
}

async function handleDetailedSearch(
  query: string,
  category: string | undefined,
  petSpecies: string,
  petSymptoms: string[],
  petAllergies: string[],
  petMainProblems: string[],
): Promise<NextResponse> {
  const healthContext = [
    `物種：${petSpecies}`,
    petMainProblems.length > 0 ? `主要健康問題：${petMainProblems.join('、')}` : '',
    petSymptoms.length > 0 ? `近期症狀：${petSymptoms.join('、')}` : '',
    petAllergies.length > 0 ? `已知過敏原 / 飲食禁忌：${petAllergies.join('、')}` : '',
  ].filter(Boolean).join('；')

  const categoryHint = category && category !== 'all'
    ? `使用者篩選的分類偏好為「${category}」，請優先回傳此類產品。`
    : ''

  const prompt = `你是寵物食品與食安專家。請搜尋「${query}」這個寵物食品或用品，找出真實存在的產品，並一併抓回每個產品的「完整資料」與「對特定毛孩的風險判定」。

${categoryHint}

這隻毛孩的狀況：${healthContext || '未提供，請以一般同物種標準評估'}

請回傳 JSON 格式（不含 markdown code block，最多 3 個最相關產品）：
{
  "products": [
    {
      "name": "完整產品名稱",
      "brand": "品牌名稱",
      "type": "feed|snack|supplement|wet|dental|shampoo|other",
      "description": "一句話描述",
      "ingredients": ["成分1", "成分2", "..."],
      "detail": {
        "variant": "規格（例：1.5kg 或 60粒/瓶）",
        "ingredientSummary": "完整成分資訊摘要（與包裝一致，1-2 句）",
        "fullIngredients": "完整成分（逐項列出，與包裝一致）",
        "nutritionalAdditives": "營養添加物（每公斤），含維生素/微量元素等",
        "nutritionFacts": [{"label": "蛋白質", "value": "25%"}, {"label": "脂肪", "value": "15%"}],
        "caloriePerKg": "熱量（例：3515千卡/公斤）",
        "spec": [{"label": "適用年齡", "value": "成齡"}, {"label": "產地", "value": "立陶宛"}],
        "manufacturing": [{"label": "製造商", "value": "..."}, {"label": "進口代理", "value": "..."}],
        "feedingGuide": [{"weight": "1-2公斤", "amount": "31-53克/日"}],
        "certifications": ["ISO 22000", "AAFCO", "FEDIAF"],
        "dataSources": ["寵物食品申報網", "原廠官網"],
        "dataUpdatedAt": "YYYY-MM-DD"
      },
      "risk": {
        "style": "none|product|brand",
        "productRiskText": "若 style=product：具體風險說明（為何此毛孩需謹慎使用此產品）",
        "brandWarningText": "若 style=brand：品牌警示一句話（例：多項產品未通過核可）"
      }
    }
  ]
}

風險判定規則（務必依該毛孩的健康問題 / 症狀 / 過敏原 / 飲食禁忌 + 產品成分 / 品牌合規 / 官方食安通報綜合判斷）：
- 產品成分含此毛孩過敏原、或對其健康問題不利 → style="product"，productRiskText 寫清楚原因。
- 品牌本身有食安通報 / 多項產品未過核可等合規疑慮（即使本品有檢驗報告）→ style="brand"，brandWarningText 簡述。本品仍可正常列出 certifications。
- 無上述疑慮 → style="none"。
- 所有文字用繁體中文。type 只能是 feed/snack/supplement/wet/dental/shampoo/other。
- dataSources 在有風險時應指向風險來源（例：食藥署不合格紀錄、原廠回覆函）。`

  type ContentBlock = { type: string; text?: string }
  const messagesParam: Parameters<typeof anthropic.messages.create>[0]['messages'] = [
    { role: 'user', content: prompt },
  ]

  let currentResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [{ type: 'web_search_20250305' as never, name: 'web_search' }],
    messages: messagesParam,
  })

  let rounds = 0
  const maxRounds = 3
  while (currentResponse.stop_reason === 'tool_use' && rounds < maxRounds) {
    rounds++
    const toolUseBlocks = currentResponse.content.filter(b => b.type === 'tool_use') as Array<{ type: 'tool_use'; id: string }>
    const allMessages = [
      ...messagesParam,
      { role: 'assistant' as const, content: currentResponse.content },
      {
        role: 'user' as const,
        content: toolUseBlocks.map(block => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: '已執行搜尋，請根據結果回答。',
        })),
      },
    ]
    currentResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [{ type: 'web_search_20250305' as never, name: 'web_search' }],
      messages: allMessages,
    })
  }

  const textBlock = currentResponse.content.find(b => b.type === 'text') as (ContentBlock & { text: string }) | undefined
  if (!textBlock) return NextResponse.json({ products: [] })

  const cleaned = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  type RawDetailed = {
    name: string
    brand?: string
    type?: string
    description?: string
    ingredients?: string[]
    detail?: Partial<ProductDetail>
    risk?: Partial<RiskInfo>
  }
  const parsed = parseJson<{ products: RawDetailed[] }>(cleaned, { products: [] })

  const products: WebProductDetailed[] = parsed.products.map(prod => {
    const mockProduct = {
      id: '__web__',
      name: prod.name,
      brand: prod.brand || null,
      type: prod.type || 'other',
      ingredientText: null,
      ingredientJson: JSON.stringify({ ingredients: prod.ingredients || [] }),
    }
    const analysis = analyzeIngredients([mockProduct], petSymptoms, petSpecies)

    const detail: ProductDetail = { ...EMPTY_DETAIL, ...(prod.detail ?? {}) }
    // 陣列欄位防呆：AI 偶爾回 null
    detail.nutritionFacts = Array.isArray(detail.nutritionFacts) ? detail.nutritionFacts : []
    detail.spec = Array.isArray(detail.spec) ? detail.spec : []
    detail.manufacturing = Array.isArray(detail.manufacturing) ? detail.manufacturing : []
    detail.feedingGuide = Array.isArray(detail.feedingGuide) ? detail.feedingGuide : []
    detail.certifications = Array.isArray(detail.certifications) ? detail.certifications : []
    detail.dataSources = Array.isArray(detail.dataSources) ? detail.dataSources : []

    const rawRisk = prod.risk ?? {}
    const style: RiskStyle = rawRisk.style === 'product' || rawRisk.style === 'brand' ? rawRisk.style : 'none'
    const risk: RiskInfo = {
      style,
      productRiskText: style === 'product' ? (rawRisk.productRiskText ?? null) : null,
      brandWarningText: style === 'brand' ? (rawRisk.brandWarningText ?? null) : null,
    }

    return {
      name: prod.name,
      brand: prod.brand || '',
      type: prod.type || 'other',
      description: prod.description || '',
      ingredients: prod.ingredients || [],
      is_from_web: true,
      cautionCount: analysis.stats.cautionCount,
      warningCount: analysis.stats.warningCount,
      toxicCount: analysis.stats.toxicCount,
      safeCount: analysis.stats.safeCount,
      detail,
      risk,
    }
  })

  return NextResponse.json({ products })
}
