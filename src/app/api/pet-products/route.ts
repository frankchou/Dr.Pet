import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/pet-products?petId=X  — list active products for a pet
export async function GET(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId')
    if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

    const items = await prisma.petProduct.findMany({
      where: { petId, isActive: true },
      include: { product: true },
      orderBy: [{ listType: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('GET /api/pet-products error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST /api/pet-products  — add a product to a pet's list
export async function POST(request: NextRequest) {
  const { petId, productId, listType, trialReason } = await request.json()
  if (!petId || !productId || !listType) {
    return NextResponse.json({ error: 'petId, productId, listType required' }, { status: 400 })
  }

  // If there's already an active entry for this pet+product, update it
  const existing = await prisma.petProduct.findFirst({
    where: { petId, productId, isActive: true },
  })
  if (existing) {
    const updated = await prisma.petProduct.update({
      where: { id: existing.id },
      data: { listType, trialReason: trialReason ?? null },
      include: { product: true },
    })
    return NextResponse.json(updated)
  }

  const entry = await prisma.petProduct.create({
    data: { petId, productId, listType, trialReason: trialReason ?? null },
    include: { product: true },
  })
  return NextResponse.json(entry, { status: 201 })
}
