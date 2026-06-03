import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// POST /api/invite/[token]/accept — 接受邀請（需登入）
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const session = await auth()

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invitation = await prisma.petInvitation.findUnique({
    where: { token },
    include: { pet: true },
  })

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: '邀請已被使用或已過期' }, { status: 400 })
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.petInvitation.update({
      where: { token },
      data: { status: 'expired' },
    })
    return NextResponse.json({ error: '邀請已過期' }, { status: 400 })
  }

  // 驗證 email 必須符合
  if (session.user.email.toLowerCase() !== invitation.targetEmail.toLowerCase()) {
    return NextResponse.json(
      { error: `此邀請是發給 ${invitation.targetEmail}，請用該帳號登入`, targetEmail: invitation.targetEmail },
      { status: 403 }
    )
  }

  // 不能接受自己發出的邀請
  if (session.user.id === invitation.invitedById) {
    return NextResponse.json({ error: '不能接受自己發出的邀請' }, { status: 400 })
  }

  // 建立 co_owner 成員（若已存在則跳過）
  await prisma.petMember.upsert({
    where: { petId_userId: { petId: invitation.petId, userId: session.user.id } },
    create: { petId: invitation.petId, userId: session.user.id, role: 'co_owner' },
    update: {},
  })

  // 更新邀請狀態
  await prisma.petInvitation.update({
    where: { token },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
      acceptedBy: session.user.id,
    },
  })

  return NextResponse.json({ petId: invitation.petId })
}
