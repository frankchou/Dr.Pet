import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { VET_REFERENCE_SCOPE } from '@/lib/utils'

interface RiskyProduct {
  name: string
  brand?: string
  type: string
  risks: string[]        // 有問題的成分或營養素名稱
  riskLevel: 'danger' | 'warning' | 'caution'
}

interface AlternativeRec {
  productName: string    // 具體推薦的產品名稱（品牌 + 系列名）
  reason: string         // 為何這款產品更適合
  keyFeatures: string[]  // 此產品的優點特性
  avoid: string[]        // 購買時要確認避開的成分或特徵
  searchTip: string      // 搜尋/選購提示
}

export interface ProductRecommendation {
  forProduct: string     // 哪個產品
  alternatives: AlternativeRec[]
}

// GET: load latest saved recommendation for a pet
export async function GET(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId')
    if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })

    const saved = await prisma.productRecommendationResult.findFirst({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    })

    if (!saved) return NextResponse.json(null)
    return NextResponse.json({ recommendations: JSON.parse(saved.resultJson), savedAt: saved.createdAt })
  } catch (error) {
    console.error('GET /api/recommend error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { petId, riskyProducts } = await request.json() as {
      petId: string
      riskyProducts: RiskyProduct[]
    }

    if (!petId || !riskyProducts?.length) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })

    const speciesLabel = pet.species === '貓' ? '貓' : '狗'
    const mainProblems: string[] = JSON.parse(pet.mainProblems || '[]')

    const productLines = riskyProducts.map((p) =>
      `- 【${p.name}${p.brand ? `（${p.brand}）` : ''}】類型：${p.type}，風險等級：${p.riskLevel}，問題點：${p.risks.join('、')}`
    ).join('\n')

    const prompt = `你是一位專業的寵物營養師。請根據以下資料，為每個有問題的產品推薦更安全的替代品方向。
${VET_REFERENCE_SCOPE}

## 寵物資料
- 物種：${speciesLabel}
- 體重：${pet.weight ? `${pet.weight} kg` : '未記錄'}
- 健康問題：${mainProblems.length > 0 ? mainProblems.join('、') : '無特別問題'}

## 目前使用中且有風險的產品
${productLines}

## 任務
請針對每個有問題的產品，推薦 1-2 款具體的替代產品。要求：
1. 必須給出具體的品牌與產品系列名稱（例如：「自然本色 白魚無穀配方」、「Orijen 無穀六種魚」）
2. 優先推薦台灣市場較容易購得、口碑良好的產品
3. 說明為何這款產品可以解決目前的問題

只回傳 JSON，格式如下：
{
  "recommendations": [
    {
      "forProduct": "產品名稱",
      "alternatives": [
        {
          "productName": "品牌 產品系列名稱（例如：自然本色 白魚無穀狗糧）",
          "reason": "為什麼這款產品更適合取代目前產品（1-2句，說明如何解決問題點）",
          "keyFeatures": ["此產品的優點特性1", "優點特性2"],
          "avoid": ["購買時仍需確認避開的成分或特徵1", "特徵2"],
          "searchTip": "在哪裡可以買到、搜尋關鍵字等具體建議（1句）"
        }
      ]
    }
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    // Strip markdown code fences if present, then extract JSON object
    const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI 回應格式錯誤')

    const { recommendations } = JSON.parse(match[0])

    // Save to DB (keep only the latest 1 record per pet)
    const old = await prisma.productRecommendationResult.findMany({
      where: { petId },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      select: { id: true },
    })
    if (old.length > 0) {
      await prisma.productRecommendationResult.deleteMany({
        where: { id: { in: old.map((r) => r.id) } },
      })
    }
    const saved = await prisma.productRecommendationResult.create({
      data: { petId, resultJson: JSON.stringify(recommendations) },
    })

    return NextResponse.json({ recommendations, savedAt: saved.createdAt })
  } catch (error) {
    console.error('POST /api/recommend error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('credit balance') || msg.includes('insufficient_quota')) {
      return NextResponse.json({ error: 'AI 服務餘額不足' }, { status: 402 })
    }
    return NextResponse.json({ error: `推薦失敗：${msg}` }, { status: 500 })
  }
}
