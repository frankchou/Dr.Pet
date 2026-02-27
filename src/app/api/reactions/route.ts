import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/reactions?petId=X&date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const petId = request.nextUrl.searchParams.get('petId')
  const date  = request.nextUrl.searchParams.get('date')
  if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

  const where: Record<string, unknown> = { petId }
  if (date) where.date = date

  const reactions = await prisma.productReaction.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(reactions)
}

// POST /api/reactions  — upsert (one per pet+product+date)
export async function POST(request: NextRequest) {
  const { petId, productId, date, rating, notes } = await request.json()
  if (!petId || !productId || !date || !rating) {
    return NextResponse.json({ error: 'petId, productId, date, rating required' }, { status: 400 })
  }

  const reaction = await prisma.productReaction.upsert({
    where: { petId_productId_date: { petId, productId, date } },
    update: { rating, notes: notes ?? null },
    create: { petId, productId, date, rating, notes: notes ?? null },
    include: { product: true },
  })

  // Fire-and-forget: trigger community logic
  fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/community/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ petId, productId, date, rating, reactionId: reaction.id }),
  }).catch(() => {})

  return NextResponse.json(reaction)
}
