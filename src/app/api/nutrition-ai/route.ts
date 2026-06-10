import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { VET_REFERENCE_SCOPE } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

interface NutrientInput {
  name: string
  totalValue: number
  unit: string
}

// demo 帳號的固定示意營養評估（不打 AI）。涵蓋 safe / caution / warning 三種狀態，
// 結構與 AI 路徑回傳的 analysis（含每項 summary）完全一致。
const DEMO_NUTRITION_ANALYSIS = {
  overall:
    '整體飲食大致均衡，蛋白質與脂肪落在合理範圍；磷略為偏高，長期需留意腎臟負擔，建議搭配充足水分與適度調整配比。',
  items: [
    {
      nutrient: '粗蛋白',
      status: 'safe',
      assessment: '蛋白質含量落在 AAFCO 維持需求的合理區間，足以支持日常活動。',
      riskDetails: '',
      recommendation: '維持目前蛋白來源，優先選擇好消化的動物性蛋白。',
      summary: '數值正常，無需調整。',
    },
    {
      nutrient: '粗脂肪',
      status: 'safe',
      assessment: '脂肪比例適中，可提供足夠能量且不致過量。',
      riskDetails: '',
      recommendation: '維持現況，避免額外添加高油脂零食。',
      summary: '比例適中，維持即可。',
    },
    {
      nutrient: '磷',
      status: 'caution',
      assessment: '磷含量略高於理想值，雖未超標但長期累積需留意。',
      riskDetails: '長期磷攝取偏高可能增加腎臟代謝負擔，對年長或腎功能較弱的毛孩影響較明顯。',
      recommendation: '可搭配低磷主食或增加濕食比例，並確保飲水充足。',
      summary: '偏高需留意，建議增水並調整配比。',
    },
    {
      nutrient: '鈉',
      status: 'warning',
      assessment: '鈉含量明顯偏高，超出日常維持的安全範圍。',
      riskDetails: '長期高鈉飲食可能增加心血管與腎臟負擔，導致水腫或血壓上升風險。',
      recommendation: '減少高鈉零食與加工食品，改以原型食物為主。',
      summary: '明顯偏高，建議降低鈉攝取。',
    },
  ],
  generalRecommendations: [
    '增加每日飲水或濕食比例，協助磷與鈉代謝',
    '減少高鈉加工零食，改以低鈉原型食物',
    '若為年長或腎功能較弱的毛孩，建議與獸醫討論低磷處方飲食',
  ],
}

// AAFCO 維持標準（乾物質基礎）
const AAFCO = {
  dog: {
    '粗蛋白':  { min: 18,   warn: 40   },
    '粗脂肪':  { min: 5.5,  warn: 25   },
    '粗纖維':  {            warn: 8    },
    '水分':    {            warn: 78   },
    '鈉':      { min: 0.08, warn: 0.5  },
    '鈣':      { min: 0.5,  warn: 2.5  },
    '磷':      { min: 0.4,  warn: 1.6  },
  },
  cat: {
    '粗蛋白':  { min: 26,   warn: 55   },
    '粗脂肪':  { min: 9,    warn: 35   },
    '粗纖維':  {            warn: 8    },
    '水分':    {            warn: 78   },
    '鈉':      { min: 0.2,  warn: 0.8  },
    '鈣':      { min: 0.3,  warn: 2.0  },
    '磷':      { min: 0.5,  warn: 2.0  },
  },
} as const

// GET: 取得最新一筆儲存的分析結果
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const saved = await prisma.nutritionAnalysis.findFirst({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    })

    if (!saved) return NextResponse.json(null)

    // 舊紀錄 / 格式異常可能缺漏陣列欄位，正規化後回傳，避免前端 crash。
    const parsed = JSON.parse(saved.resultJson)
    return NextResponse.json({
      overall: typeof parsed.overall === 'string' ? parsed.overall : '',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      generalRecommendations: Array.isArray(parsed.generalRecommendations) ? parsed.generalRecommendations : [],
      savedAt: saved.createdAt,
      productCount: saved.productCount,
    })
  } catch (error) {
    console.error('GET /api/nutrition-ai error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { petId, nutrients, productCount } = await request.json() as {
      petId: string
      nutrients: NutrientInput[]
      productCount: number
    }

    if (!petId || !nutrients?.length) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // AI route：先驗權限再呼叫 anthropic，避免無權者燒 token
    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // demo 帳號：存固定示意評估，不打 AI。仍寫入 NutritionAnalysis 讓 GET / 歷史正常。
    if (isDemoUser(session)) {
      const oldRecords = await prisma.nutritionAnalysis.findMany({
        where: { petId },
        orderBy: { createdAt: 'desc' },
        skip: 2,
        select: { id: true },
      })
      if (oldRecords.length > 0) {
        await prisma.nutritionAnalysis.deleteMany({
          where: { id: { in: oldRecords.map((r) => r.id) } },
        })
      }
      const saved = await prisma.nutritionAnalysis.create({
        data: { petId, resultJson: JSON.stringify(DEMO_NUTRITION_ANALYSIS), productCount },
      })
      return NextResponse.json({
        ...DEMO_NUTRITION_ANALYSIS,
        savedAt: saved.createdAt,
        productCount: saved.productCount,
      })
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })

    const isCat = pet.species === '貓'
    const speciesLabel = isCat ? '貓' : '犬'
    const aafco = isCat ? AAFCO.cat : AAFCO.dog

    // 計算年齡
    let ageText = '年齡未知'
    if (pet.birthday) {
      const ageYears = Math.floor(
        (Date.now() - new Date(pet.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      )
      ageText = `${ageYears} 歲`
    }

    // 建立 AAFCO 參考表文字
    const aafcoLines = Object.entries(aafco)
      .map(([name, range]) => {
        const parts: string[] = []
        if ('min' in range && range.min !== undefined) parts.push(`最低需求：≥${range.min}%`)
        if (range.warn !== undefined) parts.push(`安全上限：<${range.warn}%`)
        return `  - ${name}：${parts.join('，')}`
      })
      .join('\n')

    // 建立營養素列表文字
    const nutrientLines = nutrients
      .map((n) => `  - ${n.name}：${n.totalValue}${n.unit}`)
      .join('\n')

    const prompt = `你是一位專業的寵物臨床營養師。請根據以下資料，分析這隻寵物的飲食營養安全性。
${VET_REFERENCE_SCOPE}

## 寵物基本資料
- 物種：${speciesLabel}
- 名稱：${pet.name}
- 體重：${pet.weight ? `${pet.weight} kg` : '未記錄'}
- 年齡：${ageText}

## 飲食營養素合計（${productCount} 種產品數值加總，乾物質基礎估算）
${nutrientLines}

> 注意：此數值為多種產品各自標示值的直接加總，代表寵物每日接觸的最高營養素負荷上限估算，實際攝取量依各產品實際餵食比例而定。

## AAFCO 成${speciesLabel}維持需求參考
${aafcoLines}

## 分析要求
請針對上方列出的每個營養素進行評估：
1. 對照 AAFCO 標準或一般寵物醫學知識，判斷數值是否過高、不足或正常
2. 若過高：說明長期過量可能導致哪些器官負擔、疾病風險或症狀（如腎臟、肝臟、骨骼等），並給出風險程度
3. 若不足：說明可能缺乏的影響
4. 若正常：標示為安全
5. 給出針對性建議（包括需要改變的飲食比例或補充建議）

請只回傳以下 JSON 格式，不要加任何其他文字或 markdown：

{
  "overall": "整體飲食安全評估（2-3句，包含最需要注意的重點）",
  "items": [
    {
      "nutrient": "營養素名稱",
      "status": "safe",
      "assessment": "此營養素的評估說明（1-2句，說明是否正常及原因）",
      "riskDetails": "若過量或不足，可能導致的疾病或健康問題（若完全安全請填空字串）",
      "recommendation": "針對此營養素的具體建議（1-2句）"
    }
  ],
  "generalRecommendations": ["整體飲食建議1", "整體飲食建議2", "整體飲食建議3"]
}

status 值只能是以下四種：
- "safe"：數值在正常範圍內，無需擔心
- "caution"：輕微偏高或偏低，建議留意
- "warning"：明顯超標或不足，建議調整飲食
- "danger"：嚴重超標，可能對健康造成明顯傷害，建議立即改善`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 回應格式錯誤')

    const parsed = JSON.parse(jsonMatch[0])
    // 正規化形狀：AI 可能回傳缺漏 items / generalRecommendations 的物件，
    // 統一補成陣列，確保落庫與 GET 回傳形狀完整，前端不會在 undefined 上 crash。
    const analysis = {
      overall: typeof parsed.overall === 'string' ? parsed.overall : '',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      generalRecommendations: Array.isArray(parsed.generalRecommendations) ? parsed.generalRecommendations : [],
    }

    // ── Step 2: 用詳細資料再生成重點摘要 ──────────────────────────────────────
    try {
      const summaryInput = (analysis.items as Array<{
        nutrient: string; status: string; assessment: string; riskDetails: string; recommendation: string
      }>).map((item) => ({
        nutrient: item.nutrient,
        status: item.status,
        assessment: item.assessment,
        riskDetails: item.riskDetails,
        recommendation: item.recommendation,
      }))

      const summaryPrompt = `根據以下每個營養素的詳細評估結果，為每個營養素各生成一句話重點摘要（最多25字）。
要求：直接說明目前狀態與最關鍵的風險點或安全點，例如「數值正常，無需調整」或「偏高可能加重腎臟負擔，建議降低攝取」。

評估資料：
${JSON.stringify(summaryInput, null, 2)}

只回傳 JSON，不加任何其他文字或 markdown：
{"summaries": {"營養素名稱": "摘要內容", ...}}`

      const summaryResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: summaryPrompt }],
      })

      const summaryText = summaryResponse.content[0].type === 'text' ? summaryResponse.content[0].text : ''
      const summaryMatch = summaryText.match(/\{[\s\S]*\}/)
      if (summaryMatch) {
        const { summaries } = JSON.parse(summaryMatch[0]) as { summaries: Record<string, string> }
        analysis.items = (analysis.items as Array<{ nutrient: string } & Record<string, unknown>>).map((item) => ({
          ...item,
          summary: summaries[item.nutrient] ?? '',
        }))
      }
    } catch (e) {
      console.warn('Summary generation failed, skipping:', e)
    }

    // 儲存分析結果至 DB（保留最近 3 筆，刪除舊的）
    const oldRecords = await prisma.nutritionAnalysis.findMany({
      where: { petId },
      orderBy: { createdAt: 'desc' },
      skip: 2,
      select: { id: true },
    })
    if (oldRecords.length > 0) {
      await prisma.nutritionAnalysis.deleteMany({
        where: { id: { in: oldRecords.map((r) => r.id) } },
      })
    }

    const saved = await prisma.nutritionAnalysis.create({
      data: {
        petId,
        resultJson: JSON.stringify(analysis),
        productCount,
      },
    })

    return NextResponse.json({
      ...analysis,
      savedAt: saved.createdAt,
      productCount: saved.productCount,
    })
  } catch (error) {
    console.error('POST /api/nutrition-ai error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('credit balance') || msg.includes('insufficient_quota')) {
      return NextResponse.json({ error: 'AI 服務餘額不足，請至 console.anthropic.com 加值後再試。' }, { status: 402 })
    }
    if (msg.includes('API key')) {
      return NextResponse.json({ error: 'API Key 未設定，請在 .env 填入 ANTHROPIC_API_KEY。' }, { status: 401 })
    }
    return NextResponse.json({ error: `分析失敗：${msg}` }, { status: 500 })
  }
}
