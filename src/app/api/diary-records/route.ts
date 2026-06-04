import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

export async function GET(request: NextRequest) {
  const petId = request.nextUrl.searchParams.get('petId')
  const date  = request.nextUrl.searchParams.get('date') // YYYY-MM-DD

  if (!petId || !date) {
    return NextResponse.json({ error: 'petId and date required' }, { status: 400 })
  }

  const session = await auth()
  const access = await requirePetAccess(petId, session?.user?.id ?? '')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const dayStart = new Date(`${date}T00:00:00.000Z`)
  const dayEnd   = new Date(`${date}T23:59:59.999Z`)

  const [symptoms, usages, healthMetric] = await Promise.all([
    prisma.symptomEntry.findMany({
      where: { petId, createdAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.productUsage.findMany({
      where: { petId, date: { gte: dayStart, lte: dayEnd } },
      include: { product: { select: { name: true, brand: true, type: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.healthMetric.findUnique({
      where: { petId_date: { petId, date } },
    }),
  ])

  return NextResponse.json({ symptoms, usages, healthMetric })
}
