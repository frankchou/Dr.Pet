import { auth, signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AcceptInviteClient from './AcceptInviteClient'

interface InviteInfo {
  petName: string
  petSpecies: string
  petBreed: string | null
  inviterName: string | null
  targetEmail: string
  status: string
  expiresAt: string
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params

  // 取得邀請資訊（Server side fetch，使用絕對路徑）
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/invite/${token}`, { cache: 'no-store' })

  if (!res.ok) {
    // 邀請不存在或已過期
    redirect('/')
  }

  const inviteInfo = await res.json() as InviteInfo

  // 若未登入，跳轉 Google 登入，登入後回到此頁
  const session = await auth()
  if (!session?.user) {
    // 使用 signIn 觸發 Google OAuth redirect
    await signIn('google', { redirectTo: `/invite/${token}` })
    return null
  }

  return (
    <AcceptInviteClient
      token={token}
      inviteInfo={inviteInfo}
      currentUserEmail={session.user.email ?? ''}
    />
  )
}
