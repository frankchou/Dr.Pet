import type { Session } from 'next-auth'

// demo 帳號判定值需與 src/lib/auth.ts 的 demo Credentials 設定一致：
// id = 'demo-user'、email = 'demo@drpet.com'。
const DEMO_USER_ID = 'demo-user'
const DEMO_EMAIL = 'demo@drpet.com'

/**
 * 是否為 demo 示範帳號。
 *
 * 設計原則（frank 拍板）：demo 帳號的所有 AI 功能一律回固定 mock，不打 Anthropic
 * （省成本、回應穩定、可重現）；真實 / 測試帳號才真的呼叫 AI。
 *
 * 各 AI endpoint 應在通過既有 auth / requirePetAccess 後，再用本函式分流。
 */
export function isDemoUser(session: Session | null): boolean {
  const user = session?.user
  if (!user) return false
  return user.id === DEMO_USER_ID || user.email === DEMO_EMAIL
}

/**
 * 是否為 demo 帳號的 userId。
 *
 * 用於只拿得到 userId（而非整個 session）的流程，例如推播發送
 * （sendPushToUser）與食安觸發。demo 帳號的推播一律改送固定 mock 內容，
 * 故發送前需以此分流。
 */
export function isDemoUserId(userId: string): boolean {
  return userId === DEMO_USER_ID
}
