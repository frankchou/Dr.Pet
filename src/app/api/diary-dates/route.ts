import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

// 回傳某寵物在指定月份「任何一種紀錄」的不重複日期清單（YYYY-MM-DD）。
//
// 用途：日誌頁月曆／週曆的「有紀錄圓點」與「已紀錄天數」需與所有紀錄來源同義，
// 不能只看 ProductUsage。故在此聚合 DailyHealthLog、ProductUsage、SymptomEntry、
// HealthMetric、MedicationRecord、GroomingRecord、MeasurementRecord 七種來源。
//
// 日期欄位有兩種儲存型態：
//   - String（YYYY-MM-DD）：DailyHealthLog / HealthMetric / Medication / Grooming / Measurement
//   - DateTime：ProductUsage / SymptomEntry（以 createdAt 或 date 落在當月區間判斷）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId     = searchParams.get('petId')
    const yearMonth = searchParams.get('yearMonth') // YYYY-MM

    if (!petId || !yearMonth) {
      return NextResponse.json({ error: 'petId and yearMonth are required' }, { status: 400 })
    }

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // 字串日期欄位以前綴比對；DateTime 欄位以當月 UTC 區間比對
    const monthPrefix = `${yearMonth}-`
    const monthStart  = new Date(`${yearMonth}-01T00:00:00.000Z`)
    const [y, m] = yearMonth.split('-').map(Number)
    const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    const monthEnd  = new Date(`${nextMonth}-01T00:00:00.000Z`)

    const stringDateWhere = { petId, date: { startsWith: monthPrefix } }
    const dateTimeWhere   = (field: 'date' | 'createdAt') => ({
      petId,
      [field]: { gte: monthStart, lt: monthEnd },
    })

    const [
      healthLogs,
      healthMetrics,
      medications,
      groomings,
      measurements,
      usages,
      symptoms,
    ] = await Promise.all([
      prisma.dailyHealthLog.findMany({ where: stringDateWhere, select: { date: true } }),
      prisma.healthMetric.findMany({ where: stringDateWhere, select: { date: true } }),
      prisma.medicationRecord.findMany({ where: stringDateWhere, select: { date: true } }),
      prisma.groomingRecord.findMany({ where: stringDateWhere, select: { date: true } }),
      prisma.measurementRecord.findMany({ where: stringDateWhere, select: { date: true } }),
      prisma.productUsage.findMany({ where: dateTimeWhere('date'), select: { date: true } }),
      prisma.symptomEntry.findMany({ where: dateTimeWhere('createdAt'), select: { createdAt: true } }),
    ])

    const dates = new Set<string>()
    for (const r of healthLogs)    dates.add(r.date)
    for (const r of healthMetrics) dates.add(r.date)
    for (const r of medications)   dates.add(r.date)
    for (const r of groomings)     dates.add(r.date)
    for (const r of measurements)  dates.add(r.date)
    for (const r of usages)        dates.add(r.date.toISOString().slice(0, 10))
    for (const r of symptoms)      dates.add(r.createdAt.toISOString().slice(0, 10))

    return NextResponse.json({ dates: Array.from(dates).sort() })
  } catch (error) {
    console.error('GET /api/diary-dates error:', error)
    return NextResponse.json({ error: 'Failed to fetch diary dates' }, { status: 500 })
  }
}
