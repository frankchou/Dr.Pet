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
  type: string           // 產品類型（乾糧/濕食/零食/補充品…）
  keyFeatures: string[]  // 選購時要注意的特性
  avoid: string[]        // 要避開的成分或特徵
  reason: string         // 為何這樣推薦
  searchTip: string      // 搜尋/選購提示
}

export interface ProductRecommendation {
  forProduct: string     // 哪個產品
  alternatives: AlternativeRec[]
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
請針對每個有問題的產品，推薦 1-2 個更安全的替代品方向（非特定品牌，而是類型、成分特性與選購方向）。

只回傳 JSON，格式如下：
{
  "recommendations": [
    {
      "forProduct": "產品名稱",
      "alternatives": [
        {
          "type": "產品類型（如：低磷貓咪濕食、天然無添加乾糧）",
          "keyFeatures": ["選購時要注意的特性1", "特性2"],
          "avoid": ["要避開的成分或特徵1", "特徵2"],
          "reason": "為什麼這樣的替代品更適合（1句）",
          "searchTip": "在寵物店或網路上如何找到這類產品的具體建議（1句）"
        }
      ]
    }
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI 回應格式錯誤')

    const { recommendations } = JSON.parse(match[0])
    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('POST /api/recommend error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('credit balance') || msg.includes('insufficient_quota')) {
      return NextResponse.json({ error: 'AI 服務餘額不足' }, { status: 402 })
    }
    return NextResponse.json({ error: `推薦失敗：${msg}` }, { status: 500 })
  }
}
