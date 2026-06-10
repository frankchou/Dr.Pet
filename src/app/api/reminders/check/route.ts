import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser, sendInBatches, type PushPayload } from '@/lib/push'

// 驗證 Cron 授權：Vercel Cron 會自動在 Header 帶 `Authorization: Bearer <CRON_SECRET>`
// （pattern 比照 news/crawl）
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

const TAIWAN_OFFSET_MS = 8 * 60 * 60 * 1000

/**
 * 計算「台灣今天 23:59:59.999」對應的 UTC 時間點。
 * Vercel 為 UTC、台灣為 UTC+8：cron 在 UTC 00:00（台灣 08:00）觸發。
 * nextReminder 由日期字串存成 UTC 午夜（例：'2026-06-10' → 2026-06-10T00:00:00Z）。
 * 取「台灣今天結束」當上界，可一次涵蓋「今天到期」與任何「先前漏推（已過期）」的提醒。
 */
function taiwanTodayEndUtc(now: Date): Date {
  // 把 now 推進 8 小時，讀其 UTC 日期部分即等於台灣當地日期
  const tw = new Date(now.getTime() + TAIWAN_OFFSET_MS)
  const y = tw.getUTCFullYear()
  const m = tw.getUTCMonth()
  const d = tw.getUTCDate()
  // 台灣當地當天 23:59:59.999 = 該日 UTC 15:59:59.999（減 8 小時換回 UTC）
  return new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - TAIWAN_OFFSET_MS)
}

interface ReminderResult {
  medicationDue: number
  groomingDue: number
  recipients: number
}

// 找出該毛孩的有權限使用者（owner + co_owner），去重後回 userId 陣列。
async function petAccessUserIds(petId: string, ownerUserId: string | null): Promise<string[]> {
  const members = await prisma.petMember.findMany({
    where: { petId },
    select: { userId: true },
  })
  const ids = new Set<string>()
  if (ownerUserId) ids.add(ownerUserId)
  for (const m of members) ids.add(m.userId)
  return Array.from(ids)
}

// 推完後更新 nextReminder：一次性 → null；週期性 → 順延一個週期。
// 若該提醒早已過期（漏推多次），以 dueBefore 為基準連推到未來，避免下一次 cron 又判定到期重推。
function computeNextReminder(
  current: Date,
  intervalDays: number | null,
  dueBefore: Date,
): Date | null {
  if (!intervalDays || intervalDays <= 0) return null
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000
  let next = current.getTime() + intervalMs
  while (next <= dueBefore.getTime()) next += intervalMs
  return new Date(next)
}

async function runReminderCheck(): Promise<ReminderResult> {
  const dueBefore = taiwanTodayEndUtc(new Date())

  const medications = await prisma.medicationRecord.findMany({
    where: { nextReminder: { not: null, lte: dueBefore } },
    select: {
      id: true,
      nextReminder: true,
      reminderIntervalDays: true,
      pet: { select: { id: true, name: true, userId: true } },
    },
  })

  const groomings = await prisma.groomingRecord.findMany({
    where: { nextReminder: { not: null, lte: dueBefore } },
    select: {
      id: true,
      nextReminder: true,
      reminderIntervalDays: true,
      pet: { select: { id: true, name: true, userId: true } },
    },
  })

  let recipients = 0

  for (const rec of medications) {
    const payload: PushPayload = {
      title: '💊 用藥提醒',
      body: `今天該幫「${rec.pet.name}」處理用藥/看診事項囉`,
      url: '/log',
      tag: `reminder-med-${rec.id}`,
    }
    const userIds = await petAccessUserIds(rec.pet.id, rec.pet.userId)
    // 分批並行送出：單一使用者失敗不影響其他人（見 sendInBatches）
    recipients += await sendInBatches(userIds, (userId) =>
      sendPushToUser(userId, payload, 'reminder'),
    )
    // demo 由 push.ts 自動換成 mock，這裡仍照常更新 nextReminder
    await prisma.medicationRecord.update({
      where: { id: rec.id },
      data: {
        nextReminder: computeNextReminder(
          rec.nextReminder ?? new Date(),
          rec.reminderIntervalDays,
          dueBefore,
        ),
      },
    })
  }

  for (const rec of groomings) {
    const payload: PushPayload = {
      title: '🛁 美容提醒',
      body: `今天該幫「${rec.pet.name}」安排洗澡美容囉`,
      url: '/log',
      tag: `reminder-grooming-${rec.id}`,
    }
    const userIds = await petAccessUserIds(rec.pet.id, rec.pet.userId)
    recipients += await sendInBatches(userIds, (userId) =>
      sendPushToUser(userId, payload, 'reminder'),
    )
    await prisma.groomingRecord.update({
      where: { id: rec.id },
      data: {
        nextReminder: computeNextReminder(
          rec.nextReminder ?? new Date(),
          rec.reminderIntervalDays,
          dueBefore,
        ),
      },
    })
  }

  return {
    medicationDue: medications.length,
    groomingDue: groomings.length,
    recipients,
  }
}

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runReminderCheck()
    return NextResponse.json(result)
  } catch (error) {
    console.error('reminders/check error:', error)
    return NextResponse.json({ error: 'Reminder check failed' }, { status: 500 })
  }
}

// Vercel Cron 以 GET 觸發；POST 供手動觸發（兩者皆需 CRON_SECRET 授權）
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request)
}
