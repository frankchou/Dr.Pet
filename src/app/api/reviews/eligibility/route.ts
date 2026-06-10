import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { reviewCooldownSince, reviewNextAvailable } from '@/lib/feedback'

// 評論資格預檢：供 ReviewModal 開啟當下查詢，避免使用者白填後才被 429 擋下。
// 判定沿用 POST 的冷卻邏輯（最近 N 天內已有 review → 不可評論）；demo 與一般帳號一致適用。
export const dynamic = 'force-dynamic'

export interface ReviewEligibilityResponse {
  canReview: boolean
  // 不可評論時提供 ISO 字串；可評論時不帶此欄位。
  nextAvailable?: string
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recent = await prisma.appReview.findFirst({
      where: { userId, createdAt: { gte: reviewCooldownSince() } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    if (recent) {
      const payload: ReviewEligibilityResponse = {
        canReview: false,
        nextAvailable: reviewNextAvailable(recent.createdAt).toISOString(),
      }
      return NextResponse.json(payload)
    }

    const payload: ReviewEligibilityResponse = { canReview: true }
    return NextResponse.json(payload)
  } catch (error) {
    console.error('GET /api/reviews/eligibility error:', error)
    return NextResponse.json({ error: 'Failed to check eligibility' }, { status: 500 })
  }
}
