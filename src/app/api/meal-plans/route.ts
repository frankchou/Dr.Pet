import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    const date = searchParams.get('date')

    if (!petId || !date) {
      return NextResponse.json({ error: 'petId and date are required' }, { status: 400 })
    }

    const plan = await prisma.dailyMealPlan.findUnique({
      where: { petId_date: { petId, date } },
      include: {
        items: {
          include: { product: true },
          orderBy: [{ session: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    return NextResponse.json(plan ?? null)
  } catch (error) {
    console.error('GET /api/meal-plans error:', error)
    return NextResponse.json({ error: 'Failed to fetch meal plan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { petId?: string; date?: string }
    const { petId, date } = body

    if (!petId || !date) {
      return NextResponse.json({ error: 'petId and date are required' }, { status: 400 })
    }

    // upsert — 若已存在直接回傳，否則建立
    const plan = await prisma.dailyMealPlan.upsert({
      where: { petId_date: { petId, date } },
      update: {},
      create: { petId, date },
      include: {
        items: {
          include: { product: true },
          orderBy: [{ session: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('POST /api/meal-plans error:', error)
    return NextResponse.json({ error: 'Failed to create meal plan' }, { status: 500 })
  }
}
