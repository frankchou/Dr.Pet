import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    const date = searchParams.get('date')

    if (!petId || !date) {
      return NextResponse.json(
        { error: 'petId and date are required' },
        { status: 400 }
      )
    }

    const log = await prisma.dailyHealthLog.findUnique({
      where: { petId_date: { petId, date } },
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error('GET /api/daily-health-log error:', error)
    return NextResponse.json({ error: 'Failed to fetch daily health log' }, { status: 500 })
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

    const { petId, date, ...rest } = body as {
      petId?: string
      date?: string
      [key: string]: unknown
    }

    if (!petId || !date) {
      return NextResponse.json(
        { error: 'petId and date are required' },
        { status: 400 }
      )
    }

    // 序列化所有 JSON array / object 欄位（前端可傳陣列，這裡統一轉成字串）
    const serialized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
        serialized[key] = JSON.stringify(value)
      } else {
        serialized[key] = value
      }
    }

    const log = await prisma.dailyHealthLog.upsert({
      where: { petId_date: { petId, date } },
      update: serialized,
      create: { petId, date, ...serialized },
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error('POST /api/daily-health-log error:', error)
    return NextResponse.json({ error: 'Failed to upsert daily health log' }, { status: 500 })
  }
}
