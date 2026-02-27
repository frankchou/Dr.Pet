// AI 自動查詢產品成分，並立即用知識庫分析對寵物的影響

import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { analyzeIngredients } from '@/lib/ingredientAnalyzer'
import { parseJson, productTypeLabel, symptomTypeLabel } from '@/lib/utils'

export interface LookupResult {
  // AI 找到的成分
  ingredients: string[]
  protein_sources: string[]
  additives: string[]
  functional_ingredients: string[]
  raw_ingredient_text: string
  // AI 對產品的描述
  product_description: string
  is_estimate: boolean   // 是否為估計值（AI 不確定時）
  // 本地知識庫分析結果（即時，不需要 AI）
  impact: {
    matched: {
      displayName: string
      category: string
      riskLevel: string
      effect: string
      tip?: string
    }[]
    toxicCount: number
    warningCount: number
    cautionCount: number
    safeCount: number
    supplements: {
      name: string
      reason: string
      priority: string
    }[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, brand, variant, petId } = body

    if (!name || !type) {
      return NextResponse.json({ error: '缺少產品名稱或類型' }, { status: 400 })
    }

    // 取得寵物症狀（若有 petId）
    let petSymptoms: string[] = []
    let petSpecies = '犬'
    if (petId) {
      const pet = await prisma.pet.findUnique({
        where: { id: petId },
        select: { species: true, mainProblems: true },
      })
      if (pet) {
        petSpecies = pet.species
        const mainProblems = parseJson<string[]>(pet.mainProblems, [])
        // 近期症狀
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const recent = await prisma.symptomEntry.findMany({
          where: { petId, createdAt: { gte: thirtyDaysAgo } },
          select: { symptomType: true },
        })
        petSymptoms = [...new Set([
          ...mainProblems,
          ...recent.map((s) => s.symptomType),
        ])]
      }
    }

    // ── AI 查詢成分 ──────────────────────────────
    const productTypeZh = productTypeLabel(type)
    const symptomsContext = petSymptoms.length > 0
      ? `（寵物目前有以下症狀：${petSymptoms.map((s) => symptomTypeLabel(s)).join('、')}）`
      : ''

    const prompt = `你是寵物食品專家。請查詢以下產品的成分資料${symptomsContext}：

產品類型：${productTypeZh}
產品名稱：${name}
品牌：${brand || '未知'}
規格：${variant || '未知'}

請回傳 JSON 格式（不含 markdown code block）：
{
  "ingredients": ["主要成分1", "主要成分2", "...（列出10-20個主要成分）"],
  "protein_sources": ["蛋白質來源1", "蛋白質來源2"],
  "additives": ["添加劑1", "添加劑2"],
  "functional_ingredients": ["功能性成分1", "功能性成分2"],
  "raw_ingredient_text": "原始成分文字",
  "product_description": "這個產品的簡短說明（1-2句）",
  "is_estimate": true或false（若確定知道此產品資料填false，否則填true）
}

說明：
- 如果你知道這個特定產品的成分，請盡量準確
- 如果不確定，根據${productTypeZh}的常見成分給出合理估計，is_estimate 設為 true
- 所有成分名稱請用繁體中文
- 若為洗毛精/牙膏等外用品，ingredients 填清潔/功能性成分`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    let aiData: {
      ingredients?: string[]
      protein_sources?: string[]
      additives?: string[]
      functional_ingredients?: string[]
      raw_ingredient_text?: string
      product_description?: string
      is_estimate?: boolean
    }

    try {
      const cleaned = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      aiData = JSON.parse(cleaned)
    } catch {
      // AI 回應無法解析，用空值
      aiData = {
        ingredients: [],
        protein_sources: [],
        additives: [],
        functional_ingredients: [],
        raw_ingredient_text: content.text.slice(0, 500),
        product_description: '無法解析 AI 回應',
        is_estimate: true,
      }
    }

    // ── 本地知識庫分析 ───────────────────────────
    // 將 AI 回傳的成分包成 product 格式，給 analyzeIngredients 使用
    const mockProduct = {
      id: '__preview__',
      name,
      brand: brand || null,
      type,
      ingredientText: aiData.raw_ingredient_text || null,
      ingredientJson: JSON.stringify({
        ingredients: aiData.ingredients || [],
        protein_sources: aiData.protein_sources || [],
        additives: aiData.additives || [],
        functional_ingredients: aiData.functional_ingredients || [],
      }),
    }

    const analysisResult = analyzeIngredients([mockProduct], petSymptoms, petSpecies)

    const result: LookupResult = {
      ingredients: aiData.ingredients || [],
      protein_sources: aiData.protein_sources || [],
      additives: aiData.additives || [],
      functional_ingredients: aiData.functional_ingredients || [],
      raw_ingredient_text: aiData.raw_ingredient_text || '',
      product_description: aiData.product_description || '',
      is_estimate: aiData.is_estimate ?? true,
      impact: {
        matched: analysisResult.matched.map((m) => ({
          displayName: m.displayName,
          category: m.category,
          riskLevel: m.riskLevel,
          effect: m.effect,
          tip: m.tip,
        })),
        toxicCount: analysisResult.stats.toxicCount,
        warningCount: analysisResult.stats.warningCount,
        cautionCount: analysisResult.stats.cautionCount,
        safeCount: analysisResult.stats.safeCount,
        supplements: analysisResult.supplements.map((s) => ({
          name: s.name,
          reason: s.reason,
          priority: s.priority,
        })),
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('credit balance is too low')) {
      return NextResponse.json(
        { error: 'AI 服務餘額不足，請至 console.anthropic.com 加值後再試。' },
        { status: 402 }
      )
    }
    if (msg.includes('API key')) {
      return NextResponse.json(
        { error: 'API Key 未設定，請在 .env 填入 ANTHROPIC_API_KEY。' },
        { status: 401 }
      )
    }
    console.error('POST /api/products/lookup error:', error)
    return NextResponse.json({ error: `查詢失敗：${msg}` }, { status: 500 })
  }
}
