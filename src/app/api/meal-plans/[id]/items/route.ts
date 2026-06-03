import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: planId } = await context.params
    const body = await request.json() as {
      session?: string
      productId?: string | null
      customName?: string | null
      quantity?: number
      unit?: string
      estimatedGrams?: number | null
      tags?: string[]
    }

    const { session, productId, customName, quantity, unit, estimatedGrams, tags } = body

    if (!session) {
      return NextResponse.json({ error: 'session is required' }, { status: 400 })
    }

    // session 必須是合法值
    if (!['morning', 'noon', 'evening'].includes(session)) {
      return NextResponse.json({ error: 'session must be morning, noon, or evening' }, { status: 400 })
    }

    // 確認 plan 存在
    const plan = await prisma.dailyMealPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    const item = await prisma.mealPlanItem.create({
      data: {
        planId,
        session,
        productId: productId ?? null,
        customName: customName ?? null,
        quantity: quantity ?? 1,
        unit: unit ?? '份',
        estimatedGrams: estimatedGrams ?? null,
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
      },
      include: { product: true },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('POST /api/meal-plans/[id]/items error:', error)
    return NextResponse.json({ error: 'Failed to create meal plan item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: planId } = await context.params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    // 確認 item 屬於該 plan，防止越權刪除
    const item = await prisma.mealPlanItem.findFirst({
      where: { id: itemId, planId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    await prisma.mealPlanItem.delete({ where: { id: itemId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/meal-plans/[id]/items error:', error)
    return NextResponse.json({ error: 'Failed to delete meal plan item' }, { status: 500 })
  }
}
