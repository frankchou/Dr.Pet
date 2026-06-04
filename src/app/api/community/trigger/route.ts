import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { processReactionForCommunity } from '@/lib/community'

// POST /api/community/trigger — 供外部（如手動補觸發）使用，需 session + 寵物權限。
// reactions POST 內部已改為直接呼叫 processReactionForCommunity，不再經由此 HTTP self-call。
export async function POST(request: NextRequest) {
  try {
    const { petId, productId, rating, reactionId } = await request.json()
    if (!petId || !productId || !rating || !reactionId) {
      return NextResponse.json(
        { error: 'petId, productId, rating, reactionId required' },
        { status: 400 }
      )
    }

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    await processReactionForCommunity({ petId, productId, rating, reactionId })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[community/trigger]', e)
    return NextResponse.json({ error: 'Failed to trigger community' }, { status: 500 })
  }
}
