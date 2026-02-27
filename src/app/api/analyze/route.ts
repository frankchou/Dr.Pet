import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { symptomTypeLabel, severityLabel, productTypeLabel, VET_REFERENCE_SCOPE } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { petId, symptomType } = body

    if (!petId) {
      return NextResponse.json({ error: 'petId is required' }, { status: 400 })
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
