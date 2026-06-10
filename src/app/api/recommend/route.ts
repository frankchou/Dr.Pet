import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { VET_REFERENCE_SCOPE } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

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

// demo 帳號的固定示意替代品推薦（不打 AI）。結構與 AI 路徑存入 resultJson 的
// recommendations 陣列完全一致（ProductRecommendation[]）。
const DEMO_RECOMMENDATIONS: ProductRecommendation[] = [
  {
    forProduct: '黃金牧場 雞肉鮮蔬成犬糧',
    alternatives: [
      {
        productName: '自然森林 無穀深海鮭魚全齡犬糧',
        reason: '改以單一動物性蛋白鮭魚取代雞肉，可避開禽類過敏原並降低皮膚搔抓風險。',
        keyFeatures: ['單一動物性蛋白', '無穀低敏配方', '添加 Omega-3 護膚'],
        avoid: ['仍需確認無雞肉副產品', '避免額外含玉米的零食搭配'],
        searchTip: '可於寵物公園、各大電商搜尋「自然森林 鮭魚 無穀」。',
      },
      {
        productName: 'Orijen 六種魚無穀犬糧',
        reason: '多種魚類蛋白來源、無穀配方，適合對禽類與穀物敏感的毛孩。',
        keyFeatures: ['高比例新鮮魚肉', '無穀', '低升糖蔬果'],
        avoid: ['價格較高需評估預算', '初次換食仍需漸進'],
        searchTip: '搜尋「Orijen 六種魚」，注意選購犬用而非貓用配方。',
      },
    ],
  },
  {
    forProduct: '海岸鮮燉 鮪魚白身罐 80g',
    alternatives: [
      {
        productName: '健康時光 低鈉鮭魚主食罐',
        reason: '以低鈉配方取代，減輕心血管與腎臟負擔，同時維持高含水量補水優點。',
        keyFeatures: ['低鈉', '高含水量', '主食級營養完整'],
        avoid: ['確認標示為主食罐而非副食罐', '避免另加高鈉湯汁'],
        searchTip: '搜尋「低鈉 主食罐 鮭魚」，並比對成分中的鈉含量。',
      },
    ],
  },
]

// GET: load latest saved recommendation for a pet
export async function GET(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId')
    if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

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

    // AI route：先驗權限再呼叫 anthropic，避免無權者燒 token
    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // demo 帳號：存固定示意推薦，不打 AI。仍寫入結果讓 GET / 歷史正常（保留最新 1 筆）。
    if (isDemoUser(session)) {
      const old = await prisma.productRecommendationResult.findMany({
        where: { petId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (old.length > 0) {
        await prisma.productRecommendationResult.deleteMany({
          where: { id: { in: old.map((r) => r.id) } },
        })
      }
      const saved = await prisma.productRecommendationResult.create({
        data: { petId, resultJson: JSON.stringify(DEMO_RECOMMENDATIONS) },
      })
      return NextResponse.json({ recommendations: DEMO_RECOMMENDATIONS, savedAt: saved.createdAt })
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
