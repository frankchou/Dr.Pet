import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

interface UnsubscribeBody {
  endpoint?: string
}

// 依 endpoint 退訂（限本人：where userId + endpoint，不信任前端身分）。
// demo 帳號與真實帳號走完全相同的退訂流程（真的刪 DB 訂閱）：
// demo 只差在「送出的推播內容」由 src/lib/push.ts 統一換成 mock，操作行為一致。
async function handle(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: UnsubscribeBody
  try {
    body = (await request.json()) as UnsubscribeBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: 'endpoint is required' }, { status: 400 })
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: body.endpoint, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  return handle(request)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request)
}
