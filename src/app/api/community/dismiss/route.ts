import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/community/dismiss  { recId }
export async function POST(request: NextRequest) {
  const { recId } = await request.json()
  if (!recId) return NextResponse.json({ error: 'recId required' }, { status: 400 })
  await prisma.communityRec.update({
    where: { id: recId },
    data: { dismissed: true },
  })
  return NextResponse.json({ ok: true })
}
