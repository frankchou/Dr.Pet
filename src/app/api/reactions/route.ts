import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { processReactionForCommunity } from '@/lib/community'

// GET /api/reactions?petId=X&date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const petId = request.nextUrl.searchParams.get('petId')
  const date  = request.nextUrl.searchParams.get('date')
  if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

  const session = await auth()
  const access = await requirePetAccess(petId, session?.user?.id ?? '')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

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

  const session = await auth()
  const access = await requirePetAccess(petId, session?.user?.id ?? '')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const reaction = await prisma.productReaction.upsert({
    where: { petId_productId_date: { petId, productId, date } },
    update: { rating, notes: notes ?? null },
    create: { petId, productId, date, rating, notes: notes ?? null },
    include: { product: true },
  })

  // 進程內直接觸發社群推薦邏輯（取代原本無 session 的 HTTP self-call）。
  // 不 await，維持原本 fire-and-forget 的回應速度；函式本身已吞錯。
  void processReactionForCommunity({ petId, productId, rating, reactionId: reaction.id })

  return NextResponse.json(reaction)
}
