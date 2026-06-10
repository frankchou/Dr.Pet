import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo'
import { sendProductErrorReportEmail } from '@/lib/email'

// 飲食頁產品卡片「錯誤回報」：使用者回報某產品資料有誤。
// 規則（frank 拍板）：所有帳號（含 demo）皆寫入 ProductErrorReport；寫入後寄信通知系統內部信箱，
// 信件主旨依環境（DATABASE_URL 是否 file:）加 [測試] / [正式] 前綴。寄信失敗不影響 API 成功。
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { productId?: string; note?: string }
    const productId = body.productId
    const note = body.note?.trim() || null

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // 確認產品存在，避免寫入孤兒回報；順帶取產品名 / 品牌供通知信使用。
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, brand: true },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await prisma.productErrorReport.create({
      data: { productId, userId, note },
    })

    // DB 已寫入即視為成功；寄信僅為通知，失敗只記 log 不讓 API 失敗。
    try {
      await sendProductErrorReportEmail({
        productName: product.name,
        brand: product.brand,
        productId,
        reporterUserId: userId,
        isDemo: isDemoUser(session),
        note,
      })
    } catch (mailError) {
      console.error('product-report email send failed:', mailError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/product-report error:', error)
    return NextResponse.json({ error: 'Failed to submit product error report' }, { status: 500 })
  }
}
