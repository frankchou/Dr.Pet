import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

// GET /api/pets/[id]/members — 取得成員清單（任何成員皆可查詢）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: petId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await requirePetAccess(petId, session.user.id)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const members = await prisma.petMember.findMany({
    where: { petId },
    include: {
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json(members)
}
