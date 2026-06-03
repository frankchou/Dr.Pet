import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/invite/[token] — 公開查詢邀請資訊
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const invitation = await prisma.petInvitation.findUnique({
    where: { token },
    include: {
      pet: { select: { name: true, species: true, breed: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  })

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (invitation.status === 'expired' || new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 404 })
  }

  return NextResponse.json({
    petName: invitation.pet.name,
    petSpecies: invitation.pet.species,
    petBreed: invitation.pet.breed,
    inviterName: invitation.invitedBy.name,
    targetEmail: invitation.targetEmail,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  })
}
