import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/community/recs?petId=X
export async function GET(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId')
    if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

    const recs = await prisma.communityRec.findMany({
      where: { forPetId: petId, dismissed: false },
      include: {
        badProduct: true,
        recommendedProduct: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    return NextResponse.json(recs)
  } catch (error) {
    console.error('GET /api/community/recs error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
