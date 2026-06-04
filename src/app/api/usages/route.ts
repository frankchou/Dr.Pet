import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // petId 改必填：無 petId 則無從驗權限（原本回全站資料屬漏洞）
    if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const usages = await prisma.productUsage.findMany({
      where: { petId },
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

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

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
