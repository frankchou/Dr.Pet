import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { sendInviteEmail } from '@/lib/email'

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

  // 確認對方尚未是成員（共同飼主）。email 比對一律轉小寫，避免 SQLite 大小寫敏感造成漏判。
  const members = await prisma.petMember.findMany({
    where: { petId },
    select: { user: { select: { email: true } } },
  })
  const alreadyMember = members.some(m => m.user.email?.toLowerCase() === targetEmail)
  if (alreadyMember) {
    return NextResponse.json({ error: '該用戶已是此毛孩的共同飼主' }, { status: 400 })
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
    include: {
      pet: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? ''
  if (!baseUrl) {
    // 缺 baseUrl 時 inviteUrl 會變成相對路徑，信件連結與 QR Code 將失效，明確警告方便部署時發現
    console.warn('[invitations] NEXTAUTH_URL / AUTH_URL 皆未設定，inviteUrl 將為相對路徑，邀請連結可能失效')
  }
  const inviteUrl = `${baseUrl}/invite/${invitation.token}`

  // 寄出邀請信。寄信失敗不應讓整個邀請流程崩潰，回傳 emailSent 供前端提示。
  let emailSent = false
  try {
    await sendInviteEmail({
      to: targetEmail,
      petName: invitation.pet.name,
      inviterName: invitation.invitedBy.name ?? '一位飼主',
      inviteUrl,
    })
    emailSent = true
  } catch (err) {
    console.error('[invitations] 邀請信寄送失敗：', err)
  }

  return NextResponse.json(
    { inviteUrl, token: invitation.token, emailSent },
    { status: 201 }
  )
}
