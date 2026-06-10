import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo'
import { sendAppReviewEmail } from '@/lib/email'
import { REVIEW_COMMENT_MAX, reviewCooldownSince, reviewNextAvailable } from '@/lib/feedback'

// 公開評論列表開旗後須即時反映新審核通過的評論，避免被靜態化 / 中間層快取回舊資料。
export const dynamic = 'force-dynamic'

// 使用者選單「評論／評分」：使用者送出星等（1-5）+ 選填留言。
// 規則（frank 拍板）：所有帳號（含 demo）皆寫入 AppReview；寫入後寄信通知系統內部信箱，
// 信件主旨依環境加 [測試] / [正式] 前綴。寄信失敗不影響 API 成功。
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { rating?: number; comment?: string }
    const rating = body.rating
    const comment = body.comment?.trim() || null

    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 })
    }

    if (comment && comment.length > REVIEW_COMMENT_MAX) {
      return NextResponse.json(
        { error: `留言請勿超過 ${REVIEW_COMMENT_MAX} 字` },
        { status: 400 },
      )
    }

    // 評論頻率限制（frank 拍板，非永久唯一）：每位使用者最近 N 天內僅能評論一次。
    // 以伺服器時間判定；demo 帳號與一般帳號一致適用。
    const recent = await prisma.appReview.findFirst({
      where: { userId, createdAt: { gte: reviewCooldownSince() } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (recent) {
      const nextAvailable = reviewNextAvailable(recent.createdAt)
      const nextDateText = nextAvailable.toLocaleDateString('zh-TW', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
      return NextResponse.json(
        { error: `每位使用者一個月僅能評論一次，下次可評論時間：${nextDateText}` },
        { status: 429 },
      )
    }

    await prisma.appReview.create({
      data: { userId, rating, comment },
    })

    // DB 已寫入即視為成功；寄信僅為通知，失敗只記 log 不讓 API 失敗。
    try {
      await sendAppReviewEmail({
        reporterUserId: userId,
        isDemo: isDemoUser(session),
        rating,
        comment,
      })
    } catch (mailError) {
      console.error('review email send failed:', mailError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}

export interface PublicReview {
  id: string
  rating: number
  comment: string | null
  createdAt: string
}

export interface PublicReviewsResponse {
  reviews: PublicReview[]
  averageRating: number
  count: number
}

// 公開評論列表：僅回傳已標記公開且審核通過的評論，供 AppReviewsList 元件用
// （目前由旗標 SHOW_PUBLIC_REVIEWS 隱藏，未來開旗標即啟用）。
export async function GET(): Promise<NextResponse> {
  try {
    const reviews = await prisma.appReview.findMany({
      where: { isPublic: true, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, rating: true, comment: true, createdAt: true },
    })

    const count = reviews.length
    const averageRating = count > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0

    const payload: PublicReviewsResponse = {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      averageRating,
      count,
    }
    return NextResponse.json(payload)
  } catch (error) {
    console.error('GET /api/reviews error:', error)
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 })
  }
}
