import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccessByRecord } from '@/lib/petAccess'

// POST /api/community/dismiss  { recId }
export async function POST(request: NextRequest) {
  const { recId } = await request.json()
  if (!recId) return NextResponse.json({ error: 'recId required' }, { status: 400 })

  const session = await auth()
  const access = await requirePetAccessByRecord('communityRec', recId, session?.user?.id ?? '')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  await prisma.communityRec.update({
    where: { id: recId },
    data: { dismissed: true },
  })
  return NextResponse.json({ ok: true })
}
