/**
 * 執行環境判斷 —— 集中於一處，避免各檔各自用隱晦條件（如 DATABASE_URL 前綴）推測環境。
 *
 * 本專案採「一份程式碼、兩套環境設定」：
 *   dev  —— 本機 / Codespace（連 dev.db）、Vercel Preview（連 preview Turso）
 *   prod —— Vercel Production（連正式 Turso）
 *
 * 判斷依據優先採用明確訊號：
 *   1. Vercel 的 VERCEL_ENV（'production' / 'preview' / 'development'）—— 部署環境最權威。
 *   2. fallback：DATABASE_URL 非 `file:` 開頭（本機 / 測試走 SQLite file:，正式走 Turso）。
 */

/** 應用程式環境。preview 視為 dev 家族：資料庫、demo 入口、信件標題都比照測試。 */
export type AppEnv = 'production' | 'preview' | 'development'

/**
 * 是否為「Vercel 上的部署環境」——連遠端資料庫在此為正當行為。
 * `src/lib/prisma.ts` 與 `prisma.config.ts` 的防呆共用這支，確保判準一致。
 *
 * 刻意**不把 `VERCEL_ENV=development` 算進來**：那是 `vercel dev` 在本機跑的值，
 * 而 `vercel env pull` 會把正式站的 DATABASE_URL / DATABASE_AUTH_TOKEN 寫進本機 .env——
 * 兩個 Vercel 官方指令一組合，就會在本機無聲連上正式庫。這正是防呆要擋的情境。
 *
 * ⚠️ 依賴 Vercel 的 System Environment Variables（預設開啟）。若在專案設定中關閉
 * 「Automatically expose System Environment Variables」，這裡會判成非部署環境而擋下連線；
 * 錯誤訊息已載明此情形與解法。判斷取「擋錯了會立刻報錯」而非「放行錯了會靜默寫進正式庫」。
 */
export function isVercelDeployment(): boolean {
  const env = process.env.VERCEL_ENV
  if (env === 'production' || env === 'preview') return true
  if (env === 'development') return false // vercel dev：人在本機
  return process.env.VERCEL === '1'
}

/**
 * 目前執行環境。Vercel 上以 VERCEL_ENV 為準；本機一律 'development'。
 *
 * 注意：不要用 NODE_ENV 取代 —— `next build` 期間 NODE_ENV 恆為 'production'，
 * 本機建置也會被誤判成正式環境。
 */
export function getAppEnv(): AppEnv {
  const vercelEnv = process.env.VERCEL_ENV
  if (vercelEnv === 'production') return 'production'
  if (vercelEnv === 'preview') return 'preview'
  if (vercelEnv === 'development') return 'development'

  // 非 Vercel（本機 / Codespace / CI）：以資料庫位置作為 fallback。
  // 正常情況一定是 file:（prisma.ts 的防呆會擋掉其他值），因此這裡回 'development'。
  // 唯一會落到 'production' 的情形，是有人設了逃生門 ALLOW_REMOTE_DB=true 在本機
  // 操作正式庫——此時通知信標成 [正式] 是刻意的：操作對象確實是正式資料。
  const dbUrl = process.env.DATABASE_URL ?? ''
  return dbUrl.length > 0 && !dbUrl.startsWith('file:') ? 'production' : 'development'
}

/** 是否為正式環境。Preview 不算正式。 */
export function isProductionEnv(): boolean {
  return getAppEnv() === 'production'
}

/** 信件主旨等通知用的環境前綴：正式 → `[正式]`、其餘（本機 / 測試 / preview）→ `[測試]`。 */
export function appEnvLabel(): '[正式]' | '[測試]' {
  return isProductionEnv() ? '[正式]' : '[測試]'
}
