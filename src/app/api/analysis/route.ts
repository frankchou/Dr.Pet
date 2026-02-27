import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeIngredients } from '@/lib/ingredientAnalyzer'
import { parseJson } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')

    if (!petId) {
      return NextResponse.json({ error: 'petId is required' }, { status: 400 })
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    // 取得近 60 天使用的產品（去重）
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const usages = await prisma.productUsage.findMany({
      where: { petId, date: { gte: sixtyDaysAgo } },
      include: { product: true },
      orderBy: { date: 'desc' },
    })

    // 去重產品
    const seenIds = new Set<string>()
    const uniqueProducts = usages
      .filter((u) => {
        if (seenIds.has(u.productId)) return false
        seenIds.add(u.productId)
        return true
      })
      .map((u) => u.product)

    if (uniqueProducts.length === 0) {
      return NextResponse.json(
        { error: '尚無使用中的食品/用品記錄，請先在「日誌」中新增產品。' },
        { status: 422 }
      )
    }

    // 取得近期症狀類型
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentSymptoms = await prisma.symptomEntry.findMany({
      where: { petId, createdAt: { gte: thirtyDaysAgo } },
      select: { symptomType: true },
    })
    const symptomTypes = [...new Set(recentSymptoms.map((s) => s.symptomType))]
    const mainProblems = parseJson<string[]>(pet.mainProblems, [])
    const allSymptoms = [...new Set([...symptomTypes, ...mainProblems])]

    // 執行系統分析
    const result = analyzeIngredients(uniqueProducts, allSymptoms, pet.species)

    // 彙整所有產品的營養成分分析值
    interface NutritionalFact { name: string; value: number; unit: string }
    interface ProductNutrition {
      productId: string
      productName: string
      facts: NutritionalFact[]
    }
    const nutritionByProduct: ProductNutrition[] = uniqueProducts.map((p) => {
      const json = parseJson<{ nutritional_facts?: NutritionalFact[] }>(p.ingredientJson ?? '', {})
      return {
        productId: p.id,
        productName: `${p.brand ? p.brand + ' ' : ''}${p.name}`,
        facts: json.nutritional_facts || [],
      }
    }).filter((p) => p.facts.length > 0)

    return NextResponse.json({
      pet: { id: pet.id, name: pet.name, species: pet.species, weight: pet.weight, avatar: pet.avatar },
      result,
      nutritionByProduct,
      analyzedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('GET /api/analysis error:', error)
    return NextResponse.json({ error: '分析失敗，請稍後再試' }, { status: 500 })
  }
}
