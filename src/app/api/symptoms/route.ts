import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    const symptomType = searchParams.get('symptomType')
    const limit = parseInt(searchParams.get('limit') || '50')

    // petId 改必填：無 petId 則無從驗權限（原本回全站資料屬漏洞）
    if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const symptoms = await prisma.symptomEntry.findMany({
      where: {
        petId,
        ...(symptomType && { symptomType }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(symptoms)
  } catch (error) {
    console.error('GET /api/symptoms error:', error)
    return NextResponse.json({ error: 'Failed to fetch symptoms' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤：body 必須為 JSON' }, { status: 400 })
    }
    const { petId, symptomType, severity, side, notes, photos } = body as {
      petId?: string; symptomType?: string; severity?: number
      side?: string; notes?: string; photos?: string[]
    }

    if (!petId || !symptomType || severity === undefined) {
      return NextResponse.json(
        { error: 'petId, symptomType, severity are required' },
        { status: 400 }
      )
    }

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const entry = await prisma.symptomEntry.create({
      data: {
        petId,
        symptomType,
        severity: parseInt(String(severity)),
        side: side || null,
        notes: notes || null,
        photos: JSON.stringify(photos || []),
      },
    })

    // 自動完成含「每日/每天/今日/日常/觀察/記錄」關鍵字的未完成任務
    const DAILY_KEYWORDS = ['每日', '每天', '今日', '日常', '觀察', '記錄']
    const pendingTasks = await prisma.weeklyTask.findMany({
      where: { petId, completed: false },
      select: { id: true, title: true },
    })
    const toComplete = pendingTasks
      .filter((t) => DAILY_KEYWORDS.some((kw) => t.title.includes(kw)))
      .map((t) => t.id)

    if (toComplete.length > 0) {
      await prisma.weeklyTask.updateMany({
        where: { id: { in: toComplete } },
        data: { completed: true },
      })
    }

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('POST /api/symptoms error:', error)
    return NextResponse.json({ error: 'Failed to create symptom entry' }, { status: 500 })
  }
}
