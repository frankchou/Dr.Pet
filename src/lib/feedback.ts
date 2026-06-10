// 問題回報 / 評論共用常數：集中於此供前後端對齊，避免前端 chips 與後端白名單漂移。

// 問題回報的分類白名單；與 FeedbackModal 的分類 chips 一致。空字串代表「不指定」。
export const FEEDBACK_CATEGORIES = ['功能異常 / Bug', '操作建議', '資料有誤', '其他'] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

// 輸入長度上限（server 端硬限、前端 textarea maxLength 對齊）。
export const FEEDBACK_CONTENT_MAX = 2000
export const REVIEW_COMMENT_MAX = 1000

// 評論頻率限制：每位使用者最近 N 天內僅能評論一次（frank 拍板，非永久唯一）。
export const REVIEW_COOLDOWN_DAYS = 30

// 問題回報防連發視窗：同 userId + 完全相同 content 於此秒數內視為重複，不重複寫入。
export const FEEDBACK_DEDUP_SECONDS = 60

export function isAllowedFeedbackCategory(value: string): value is FeedbackCategory {
  return (FEEDBACK_CATEGORIES as readonly string[]).includes(value)
}

// 冷卻起算時間：此時間之後（含）的 review 才算「在冷卻期內」。
// 由 POST backstop 與 GET eligibility 共用，避免兩處天數計算漂移。
export function reviewCooldownSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - REVIEW_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
}

// 由最近一筆 review 的 createdAt 推算下次可評論時間（createdAt + N 天）。
export function reviewNextAvailable(latestCreatedAt: Date): Date {
  return new Date(latestCreatedAt.getTime() + REVIEW_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
}
