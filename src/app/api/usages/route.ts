import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const usages = await prisma.productUsage.findMany({
      where: petId ? { petId } : undefined,
      orderBy: { date: 'desc' },
      take: limit,
      include: { product: true },
    })

    return NextResponse.json(usages)
  } catch (error) {
    console.error('GET /api/usages error:', error)
    return NextResponse.json({ error: 'Failed to fetch usages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { petId, productId, date, frequency, amountLevel, notes } = body

    if (!petId || !productId) {
      return NextResponse.json(
        { error: 'petId and productId are required' },
        { status: 400 }
      )
    }

    const usage = await prisma.productUsage.create({
      data: {
        petId,
        productId,
        date: date ? new Date(date) : new Date(),
        frequency: frequency || null,
        amountLevel: amountLevel || null,
        notes: notes || null,
      },
      include: { product: true },
    })

    return NextResponse.json(usage, { status: 201 })
  } catch (error) {
    console.error('POST /api/usages error:', error)
    return NextResponse.json({ error: 'Failed to create usage' }, { status: 500 })
  }
}
