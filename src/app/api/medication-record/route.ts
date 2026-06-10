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

    // ?recent=N 模式：回傳最近 N 筆（供歷史標籤用）
    if (recentParam !== null) {
      const take = Math.max(1, parseInt(recentParam) || 5)
      const records = await prisma.medicationRecord.findMany({
        where: { petId },
        orderBy: { createdAt: 'desc' },
        take,
      })
      return NextResponse.json(records)
    }

    if (!date) {
      return NextResponse.json({ error: 'date or recent is required' }, { status: 400 })
    }

    // ?date=YYYY-MM-DD 模式：回傳當日最新一筆
    const record = await prisma.medicationRecord.findFirst({
      where: { petId, date },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('GET /api/medication-record error:', error)
    return NextResponse.json({ error: 'Failed to fetch medication record' }, { status: 500 })
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
      vaccines,
      deworming,
      prescriptions,
      clinicVisits,
      photoUrl,
      nextReminder,
      reminderIntervalDays,
    } = body as {
      petId?: string
      date?: string
      vaccines?: unknown[]
      deworming?: unknown[]
      prescriptions?: unknown[]
      clinicVisits?: unknown[]
      photoUrl?: string
      nextReminder?: string
      reminderIntervalDays?: number
    }

    if (!petId || !date) {
      return NextResponse.json(
        { error: 'petId and date are required' },
        { status: 400 }
      )
    }

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const record = await prisma.medicationRecord.create({
      data: {
        petId,
        date,
        vaccines: JSON.stringify(vaccines ?? []),
        deworming: JSON.stringify(deworming ?? []),
        prescriptions: JSON.stringify(prescriptions ?? []),
        clinicVisits: JSON.stringify(clinicVisits ?? []),
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
    console.error('POST /api/medication-record error:', error)
    return NextResponse.json({ error: 'Failed to create medication record' }, { status: 500 })
  }
}
