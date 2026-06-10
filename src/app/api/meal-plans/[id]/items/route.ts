import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccessByRecord } from '@/lib/petAccess'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: planId } = await context.params

    const authSession = await auth()
    const access = await requirePetAccessByRecord('dailyMealPlan', planId, authSession?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

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

    // plan 存在性已由 requirePetAccessByRecord 反查確認

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

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: planId } = await context.params

    const authSession = await auth()
    const access = await requirePetAccessByRecord('dailyMealPlan', planId, authSession?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json() as { itemId?: string; quantity?: number }
    const { itemId, quantity } = body

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    // 數量驗證：必須是 > 0 且 <= 9999 的有限數字（API 為信任邊界，前端可被繞過）
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0 || quantity > 9999) {
      return NextResponse.json({ error: 'quantity must be a positive number between 0 and 9999' }, { status: 400 })
    }

    // 確認 item 屬於該 plan，防止越權修改
    const item = await prisma.mealPlanItem.findFirst({
      where: { id: itemId, planId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const updated = await prisma.mealPlanItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/meal-plans/[id]/items error:', error)
    return NextResponse.json({ error: 'Failed to update meal plan item' }, { status: 500 })
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

    const session = await auth()
    const access = await requirePetAccessByRecord('dailyMealPlan', planId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

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
