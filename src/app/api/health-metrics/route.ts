import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

export async function GET(request: NextRequest) {
  const petId = request.nextUrl.searchParams.get('petId')
  const date = request.nextUrl.searchParams.get('date')
  if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

  const session = await auth()
  const access = await requirePetAccess(petId, session?.user?.id ?? '')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  if (date) {
    const record = await prisma.healthMetric.findUnique({
      where: { petId_date: { petId, date } },
    })
    return NextResponse.json(record ?? null)
  }

  // 最新一筆
  const latest = await prisma.healthMetric.findFirst({
    where: { petId },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(latest ?? null)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      petId: string
      date: string
      bodyScore?: number | null
      vitality?: string | null
      waterIntake?: string | null
      notes?: string | null
    }
    const { petId, date, bodyScore, vitality, waterIntake, notes } = body
    if (!petId || !date) return NextResponse.json({ error: 'petId and date required' }, { status: 400 })

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const record = await prisma.healthMetric.upsert({
      where: { petId_date: { petId, date } },
      update: { bodyScore: bodyScore ?? null, vitality: vitality ?? null, waterIntake: waterIntake ?? null, notes: notes ?? null },
      create: { petId, date, bodyScore: bodyScore ?? null, vitality: vitality ?? null, waterIntake: waterIntake ?? null, notes: notes ?? null },
    })
    return NextResponse.json(record)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
