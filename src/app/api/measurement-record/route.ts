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

    const record = await prisma.measurementRecord.findFirst({
      where: { petId, date },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('GET /api/measurement-record error:', error)
    return NextResponse.json({ error: 'Failed to fetch measurement record' }, { status: 500 })
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
      weightKg,
      bodyCondition,
      rrr,
      bloodSugarTiming,
      bloodSugarMgdl,
      bloodPressureSys,
      bloodPressureDia,
      tempMethod,
      tempCelsius,
    } = body as {
      petId?: string
      date?: string
      weightKg?: number
      bodyCondition?: string
      rrr?: number
      bloodSugarTiming?: string
      bloodSugarMgdl?: number
      bloodPressureSys?: number
      bloodPressureDia?: number
      tempMethod?: string
      tempCelsius?: number
    }

    if (!petId || !date) {
      return NextResponse.json(
        { error: 'petId and date are required' },
        { status: 400 }
      )
    }

    const record = await prisma.measurementRecord.create({
      data: {
        petId,
        date,
        weightKg: weightKg ?? null,
        bodyCondition: bodyCondition ?? null,
        rrr: rrr ?? null,
        bloodSugarTiming: bloodSugarTiming ?? null,
        bloodSugarMgdl: bloodSugarMgdl ?? null,
        bloodPressureSys: bloodPressureSys ?? null,
        bloodPressureDia: bloodPressureDia ?? null,
        tempMethod: tempMethod ?? null,
        tempCelsius: tempCelsius ?? null,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('POST /api/measurement-record error:', error)
    return NextResponse.json({ error: 'Failed to create measurement record' }, { status: 500 })
  }
}
