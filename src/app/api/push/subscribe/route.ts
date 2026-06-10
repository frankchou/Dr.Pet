import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

interface SubscribeBody {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
  foodAlertEnabled?: boolean
  reminderEnabled?: boolean
}

// 回傳目前使用者的訂閱狀態與兩個開關（供設定頁顯示）。
// 多裝置可能有多筆訂閱，這裡回傳「是否有任一訂閱」與最近一筆的偏好。
export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // demo 帳號也存真訂閱（OS 才收得到），訂閱狀態與真實使用者一視同仁。
  // 推播內容會在發送端（src/lib/push.ts）統一換成 mock。

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { foodAlertEnabled: true, reminderEnabled: true },
  })

  const latest = subscriptions[0]
  return NextResponse.json({
    subscribed: subscriptions.length > 0,
    foodAlertEnabled: latest?.foodAlertEnabled ?? true,
    reminderEnabled: latest?.reminderEnabled ?? true,
  })
}

// 建立 / 更新訂閱（upsert by endpoint）。可一併帶兩個偏好開關。
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // demo 帳號也真的存訂閱（這樣 OS 才收得到推播）；
  // 推播內容會在發送端（src/lib/push.ts）統一換成 mock。

  let body: SubscribeBody
  try {
    body = (await request.json()) as SubscribeBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const endpoint = body.endpoint
  const p256dh = body.keys?.p256dh
  const auth256 = body.keys?.auth
  if (!endpoint || !p256dh || !auth256) {
    return NextResponse.json(
      { error: 'endpoint and keys (p256dh, auth) are required' },
      { status: 400 },
    )
  }

  // 偏好開關：未帶則維持/預設 true
  const foodAlertEnabled = body.foodAlertEnabled ?? true
  const reminderEnabled = body.reminderEnabled ?? true

  // endpoint 為唯一鍵：同裝置重訂閱時覆寫金鑰與擁有者（金鑰可能輪替）
  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      endpoint,
      p256dh,
      auth: auth256,
      foodAlertEnabled,
      reminderEnabled,
    },
    update: {
      userId: session.user.id,
      p256dh,
      auth: auth256,
      foodAlertEnabled,
      reminderEnabled,
    },
    select: { foodAlertEnabled: true, reminderEnabled: true },
  })

  return NextResponse.json({ ok: true, ...subscription })
}
