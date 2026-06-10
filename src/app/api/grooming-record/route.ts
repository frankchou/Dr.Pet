import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    const date = searchParams.get('date')
    const recentParam = searchParams.get('recent')

    if (!petId) {
      return NextResponse.json({ error: 'petId is required' }, { status: 400 })
    }

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // ?recent=N 模式：回傳最近 N 筆（供首頁未來日程/歷史用）
    if (recentParam !== null) {
      const take = Math.max(1, parseInt(recentParam) || 5)
      const records = await prisma.groomingRecord.findMany({
        where: { petId },
        orderBy: { date: 'desc' },
        take,
      })
      return NextResponse.json(records)
    }

    if (!date) {
      return NextResponse.json({ error: 'date or recent is required' }, { status: 400 })
    }

    const record = await prisma.groomingRecord.findFirst({
      where: { petId, date },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('GET /api/grooming-record error:', error)
    return NextResponse.json({ error: 'Failed to fetch grooming record' }, { status: 500 })
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

    const {
      petId,
      date,
      mode,
      medBath,
      medBathProduct,
      carbonatedSpa,
      carbonatedProduct,
      dentalClean,
      dentalProduct,
      customTreatment,
      customName,
      photoUrl,
      nextReminder,
      reminderIntervalDays,
    } = body as {
      petId?: string
      date?: string
      mode?: string
      medBath?: boolean
      medBathProduct?: string
      carbonatedSpa?: boolean
      carbonatedProduct?: string
      dentalClean?: boolean
      dentalProduct?: string
      customTreatment?: boolean
      customName?: string
      photoUrl?: string
      nextReminder?: string
      reminderIntervalDays?: number
    }

    if (!petId || !date || !mode) {
      return NextResponse.json(
        { error: 'petId, date and mode are required' },
        { status: 400 }
      )
    }

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const record = await prisma.groomingRecord.create({
      data: {
        petId,
        date,
        mode,
        medBath: medBath ?? false,
        medBathProduct: medBathProduct ?? null,
        carbonatedSpa: carbonatedSpa ?? false,
        carbonatedProduct: carbonatedProduct ?? null,
        dentalClean: dentalClean ?? false,
        dentalProduct: dentalProduct ?? null,
        customTreatment: customTreatment ?? false,
        customName: customName ?? null,
        photoUrl: photoUrl ?? null,
        nextReminder: nextReminder ? new Date(nextReminder) : null,
        // 週期天數僅在 > 0 時保存；0 或負值視為一次性（null）
        reminderIntervalDays:
          typeof reminderIntervalDays === 'number' && reminderIntervalDays > 0
            ? reminderIntervalDays
            : null,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('POST /api/grooming-record error:', error)
    return NextResponse.json({ error: 'Failed to create grooming record' }, { status: 500 })
  }
}
