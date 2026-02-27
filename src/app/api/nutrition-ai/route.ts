import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'

interface NutrientInput {
  name: string
  totalValue: number
  unit: string
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

    const saved = await prisma.nutritionAnalysis.findFirst({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    })

    if (!saved) return NextResponse.json(null)

    return NextResponse.json({
      ...JSON.parse(saved.resultJson),
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

    const analysis = JSON.parse(jsonMatch[0])

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
