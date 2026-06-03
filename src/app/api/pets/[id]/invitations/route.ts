import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

// GET /api/pets/[id]/invitations — 取得邀請清單（owner only）
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
  if (access.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invitations = await prisma.petInvitation.findMany({
    where: { petId },
    orderBy: { createdAt: 'desc' },
    include: {
      invitedBy: { select: { name: true, email: true } },
    },
  })

  return NextResponse.json(invitations)
}

// POST /api/pets/[id]/invitations — 建立新邀請（owner only）
export async function POST(
  req: NextRequest,
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
  if (access.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { email?: string }
  const targetEmail = body.email?.trim().toLowerCase()
  if (!targetEmail) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  // 確認對方尚未是成員
  const existingMember = await prisma.petMember.findFirst({
    where: { petId, user: { email: targetEmail } },
  })
  if (existingMember) {
    return NextResponse.json({ error: '該用戶已是此毛孩的成員' }, { status: 400 })
  }

  // 若已有 pending 邀請，先將其設為 expired
  await prisma.petInvitation.updateMany({
    where: { petId, targetEmail, status: 'pending' },
    data: { status: 'expired' },
  })

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 天後

  const invitation = await prisma.petInvitation.create({
    data: {
      petId,
      invitedById: session.user.id,
      targetEmail,
      expiresAt,
    },
  })

  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invitation.token}`

  return NextResponse.json({ inviteUrl, token: invitation.token }, { status: 201 })
}
