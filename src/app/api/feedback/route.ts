import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo'
import { sendFeedbackEmail } from '@/lib/email'
import { FEEDBACK_CONTENT_MAX, FEEDBACK_DEDUP_SECONDS, isAllowedFeedbackCategory } from '@/lib/feedback'

// 使用者選單「問題回報」：使用者送出文字問題。
// 規則（frank 拍板）：所有帳號（含 demo）皆寫入 Feedback；寫入後寄信通知系統內部信箱，
// 信件主旨依環境加 [測試] / [正式] 前綴。寄信失敗不影響 API 成功。
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { content?: string; category?: string }
    const content = body.content?.trim()
    const rawCategory = body.category?.trim()
    // category 為選填：未提供 → null；提供但非白名單值 → 落為 null（不擋送出，但不存髒資料）。
    const category = rawCategory && isAllowedFeedbackCategory(rawCategory) ? rawCategory : null

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    if (content.length > FEEDBACK_CONTENT_MAX) {
      return NextResponse.json(
        { error: `問題內容請勿超過 ${FEEDBACK_CONTENT_MAX} 字` },
        { status: 400 },
      )
    }

    // 輕量防連發：同 userId + 完全相同 content 於最近 N 秒內已寫入 → 視為重複，忽略不重複寫，直接回成功。
    const dedupSince = new Date(Date.now() - FEEDBACK_DEDUP_SECONDS * 1000)
    const duplicate = await prisma.feedback.findFirst({
      where: { userId, content, createdAt: { gte: dedupSince } },
      select: { id: true },
    })
    if (duplicate) {
      return NextResponse.json({ ok: true })
    }

    await prisma.feedback.create({
      data: { userId, content, category },
    })

    // DB 已寫入即視為成功；寄信僅為通知，失敗只記 log 不讓 API 失敗。
    try {
      await sendFeedbackEmail({
        reporterUserId: userId,
        isDemo: isDemoUser(session),
        category,
        content,
      })
    } catch (mailError) {
      console.error('feedback email send failed:', mailError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/feedback error:', error)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}
