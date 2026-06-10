import webpush from 'web-push'
import { prisma } from './prisma'
import { isDemoUserId } from './demo'

// VAPID 設定：私鑰只在本檔使用，絕不進前端 / log / commit。
// setVapidDetails 在模組載入時執行一次；缺金鑰時延後到實際送推播才報錯（避免 build 期 import 即炸）。
let vapidConfigured = false

function ensureVapidConfigured(): void {
  if (vapidConfigured) return
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

export interface PushPayload {
  title: string
  body: string
  url: string // notificationclick 導向的頁面
  tag?: string
  icon?: string
  badge?: string
  // 個人化頭條旗標：命中飼主正在使用的產品時，sw.js 依此把通知顯示得更顯眼
  // （requireInteraction / renotify / vibrate）。隨 JSON.stringify 帶到 sw.js 讀取。
  priority?: 'high'
  headline?: boolean
}

// 單筆訂閱所需的最小欄位
export interface PushSubscriptionKeys {
  endpoint: string
  p256dh: string
  auth: string
}

// 推播類別：對應 PushSubscription 的兩個偏好開關
export type PushKind = 'foodAlert' | 'reminder'

// demo 帳號的固定 mock 推播內容（frank 拍板）：
// demo 也走真實觸發流程（OS 收得到），但內容一律換成具代表性的範例，
// 不外洩真實食安內容、回應穩定可重現。結構與正常 payload 一致。
const DEMO_MOCK_PAYLOAD: Record<PushKind, PushPayload> = {
  foodAlert: {
    title: '⚠️ 食安警報（範例）',
    body: '範例：某品牌雞肉乾糧檢出黃麴毒素超標，建議暫停餵食並留意毛孩狀況。',
    url: '/news',
    tag: 'demo-food-alert',
  },
  reminder: {
    title: '🐾 每日提醒（範例）',
    body: '範例：別忘了今天幫毛孩記錄飲食與症狀，並補充足夠飲水。',
    url: '/log',
    tag: 'demo-reminder',
  },
}

/**
 * 對單筆訂閱送推播。
 * 訂閱失效（statusCode 410 Gone / 404 Not Found）→ 自動從 DB 刪除該 endpoint。
 * 其他錯誤僅記 log、不刪（可能是暫時性問題）。
 */
export async function sendPush(
  subscription: PushSubscriptionKeys,
  payload: PushPayload,
): Promise<boolean> {
  ensureVapidConfigured()
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    )
    return true
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 410 || statusCode === 404) {
      // 失效訂閱：清除避免累積與重複嘗試（不存在則忽略）
      await prisma.pushSubscription
        .delete({ where: { endpoint: subscription.endpoint } })
        .catch(() => {})
    } else {
      console.error('sendPush error:', statusCode, error)
    }
    return false
  }
}

/**
 * 對某使用者的所有有效訂閱送推播，依推播類別過濾對應的開關。
 * 逐筆獨立送出，一筆失敗不影響其他筆；回傳成功送達筆數。
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  kind: PushKind,
): Promise<number> {
  const where =
    kind === 'foodAlert'
      ? { userId, foodAlertEnabled: true }
      : { userId, reminderEnabled: true }

  const subscriptions = await prisma.pushSubscription.findMany({
    where,
    select: { endpoint: true, p256dh: true, auth: true },
  })

  // demo 帳號一律送該 kind 的固定 mock 內容（一處統一，涵蓋所有觸發流程）
  const outboundPayload = isDemoUserId(userId) ? DEMO_MOCK_PAYLOAD[kind] : payload

  const results = await Promise.all(
    subscriptions.map((sub) => sendPush(sub, outboundPayload)),
  )
  return results.filter(Boolean).length
}

// 分批並行上限：serverless 環境避免一次開太多外送連線，逐批 Promise.allSettled。
const PUSH_BATCH_SIZE = 50

/**
 * 對一群目標分批並行執行送推播工作（每批上限 PUSH_BATCH_SIZE）。
 * 用 Promise.allSettled：單一目標失敗（含其內部 sendPush 拋錯）不影響同批其他目標。
 * 各 worker 自行回傳「成功送達筆數」，最後加總。
 * 失效訂閱（410/404）的清除沿用 sendPush 既有行為。
 */
export async function sendInBatches<T>(
  items: T[],
  worker: (item: T) => Promise<number>,
): Promise<number> {
  let delivered = 0
  for (let i = 0; i < items.length; i += PUSH_BATCH_SIZE) {
    const batch = items.slice(i, i + PUSH_BATCH_SIZE)
    const settled = await Promise.allSettled(batch.map(worker))
    for (const result of settled) {
      if (result.status === 'fulfilled') delivered += result.value
    }
  }
  return delivered
}
