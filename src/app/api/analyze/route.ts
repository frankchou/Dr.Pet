import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { symptomTypeLabel, severityLabel, productTypeLabel, VET_REFERENCE_SCOPE } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

// demo 帳號的固定示意關聯分析（不打 AI）。內容取代表性的症狀×產品關聯：
// 以皮膚搔癢對應雞肉蛋白的常見過敏關聯為例，結構與 AI 路徑回傳完全一致。
const DEMO_ANALYSIS = {
  suspectedTriggers: [
    {
      name: '雞肉蛋白來源飼料',
      confidence: 'medium',
      basis: '近兩週皮膚搔癢加劇的時間點，與開始餵食含雞肉主食的時間吻合。',
      action: '可嘗試改用單一動物性蛋白（如鮭魚、鴨肉）配方，觀察 2-3 週搔抓是否減少。',
    },
    {
      name: '季節性環境過敏原',
      confidence: 'low',
      basis: '搔癢於換季期間出現，可能與塵蟎或花粉等環境因子有關，但目前證據有限。',
      action: '維持環境清潔與除濕，必要時諮詢獸醫是否需做過敏原檢測。',
    },
  ],
  helpfulFactors: ['補充 Omega-3 魚油後皮膚狀況較穩定', '規律記錄飲食與症狀有助於追蹤趨勢'],
  confidence: 'medium',
  rationale:
    '綜合近 30 天記錄，皮膚搔癢與含雞肉飼料之間呈現時間關聯，建議優先從飲食調整著手並持續觀察。此為資訊整理與觀察建議，不能替代獸醫診斷。',
  recommendedActions: [
    '試行 2-3 週單一蛋白排除飲食，期間不更換其他變因',
    '每日記錄搔抓頻率與皮膚狀況，方便比對',
    '若出現紅腫、脫毛或精神食慾下降，請儘速就醫',
  ],
}

// GET /api/analyze?petId=X — 讀取該寵物最新的關聯分析（AIInsight）供顯示端使用
export async function GET(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId')
    if (!petId) {
      return NextResponse.json({ error: 'petId is required' }, { status: 400 })
    }

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const insight = await prisma.aIInsight.findFirst({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(insight)
  } catch (error) {
    console.error('GET /api/analyze error:', error)
    return NextResponse.json({ error: 'Failed to fetch insight' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { petId, symptomType } = body

    if (!petId) {
      return NextResponse.json({ error: 'petId is required' }, { status: 400 })
    }

    // AI route：先驗權限再呼叫 anthropic，避免無權者燒 token
    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // demo 帳號：存固定示意分析，不打 AI。仍寫入 AIInsight 讓歷史 / GET 正常。
    if (isDemoUser(session)) {
      const insight = await prisma.aIInsight.create({
        data: {
          petId,
          symptomType: symptomType || null,
          suspectedTriggers: JSON.stringify(DEMO_ANALYSIS.suspectedTriggers),
          helpfulFactors: JSON.stringify(DEMO_ANALYSIS.helpfulFactors),
          confidence: DEMO_ANALYSIS.confidence,
          rationale: DEMO_ANALYSIS.rationale,
          recommendedActions: JSON.stringify(DEMO_ANALYSIS.recommendedActions),
        },
      })
      return NextResponse.json(insight, { status: 201 })
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const symptoms = await prisma.symptomEntry.findMany({
      where: {
        petId,
        ...(symptomType && { symptomType }),
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'asc' },
    })

    const usages = await prisma.productUsage.findMany({
      where: {
        petId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
      include: { product: true },
    })

    const symptomsText = symptoms
      .map(
        (s) =>
          `${new Date(s.createdAt).toLocaleDateString('zh-TW')} ${symptomTypeLabel(s.symptomType)} 嚴重度${severityLabel(s.severity)}(${s.severity})${s.notes ? ' ' + s.notes : ''}`
      )
      .join('\n')

    const usagesText = usages
      .map(
        (u) =>
          `${new Date(u.date).toLocaleDateString('zh-TW')} ${productTypeLabel(u.product.type)} ${u.product.name}${u.product.brand ? ' (' + u.product.brand + ')' : ''}`
      )
      .join('\n')

    const prompt = `以下是寵物「${pet.name}」過去30天的症狀記錄和產品使用記錄。請分析可能的相關性和觸發因素，給出觀察建議。
${VET_REFERENCE_SCOPE}


## 症狀記錄
${symptomsText || '（無記錄）'}

## 產品使用記錄
${usagesText || '（無記錄）'}

請以JSON格式回答，包含以下欄位：
{
  "suspectedTriggers": [{"name": "觸發因素名稱", "confidence": "low/medium/high", "basis": "推斷依據", "action": "建議行動"}],
  "helpfulFactors": ["有益因素1", "有益因素2"],
  "confidence": "low/medium/high",
  "rationale": "整體分析說明",
  "recommendedActions": ["建議行動1", "建議行動2", "建議行動3"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response')

    let analysisData: {
      suspectedTriggers?: unknown[]
      helpfulFactors?: unknown[]
      confidence?: string
      rationale?: string
      recommendedActions?: unknown[]
    }
    try {
      const cleanedText = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysisData = JSON.parse(cleanedText)
    } catch {
      analysisData = {
        suspectedTriggers: [],
        helpfulFactors: [],
        confidence: 'low',
        rationale: content.text,
        recommendedActions: [],
      }
    }

    const insight = await prisma.aIInsight.create({
      data: {
        petId,
        symptomType: symptomType || null,
        suspectedTriggers: JSON.stringify(analysisData.suspectedTriggers || []),
        helpfulFactors: JSON.stringify(analysisData.helpfulFactors || []),
        confidence: analysisData.confidence || 'low',
        rationale: analysisData.rationale || null,
        recommendedActions: JSON.stringify(analysisData.recommendedActions || []),
      },
    })

    return NextResponse.json(insight, { status: 201 })
  } catch (error) {
    console.error('POST /api/analyze error:', error)
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 })
  }
}
