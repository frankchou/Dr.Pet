/**
 * 執行環境判斷 —— 集中於一處，避免各檔各自用隱晦條件（如 DATABASE_URL 前綴）推測環境。
 *
 * 判斷依據優先採用明確訊號：
 *   1. Vercel 的 VERCEL_ENV（'production' / 'preview' / 'development'）—— 部署環境最權威。
 *   2. fallback：DATABASE_URL 非 `file:` 開頭（本機 / 測試走 SQLite file:，正式走 Turso）。
 */
export function isProductionEnv(): boolean {
  // Vercel 正式環境最明確
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === 'production'
  }
  // fallback：本機 / 測試的 SQLite 以 file: 開頭，正式 Turso 則否
  const dbUrl = process.env.DATABASE_URL ?? ''
  return dbUrl.length > 0 && !dbUrl.startsWith('file:')
}

/** 信件主旨等通知用的環境前綴：正式 → `[正式]`、其餘（本機 / 測試）→ `[測試]`。 */
export function appEnvLabel(): '[正式]' | '[測試]' {
  return isProductionEnv() ? '[正式]' : '[測試]'
}
