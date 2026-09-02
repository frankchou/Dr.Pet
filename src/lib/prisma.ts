import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'
import { isVercelDeployment } from '@/lib/env'

/**
 * 把連線字串縮成「協定 + host」，用於錯誤訊息。
 * 必須排除 userinfo（user:password@）與 query（?authToken=...），否則會把憑證印進 log。
 * 用 URL 解析而非正則：正則不匹配時 String.replace 會原樣回傳，等於全文洩漏。
 */
function safeHost(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.host ? `${parsed.protocol}//${parsed.host}` : parsed.protocol
  } catch {
    return '(無法解析的 DATABASE_URL)'
  }
}

/**
 * 防呆：開發 / 測試環境禁止連遠端資料庫。
 *
 * 本專案 dev 與 prod 是「兩個實體資料庫完全切開」——
 * dev 只碰本機 dev.db、prod 只在 Vercel 上連 Turso。
 * 過去曾發生本機 .env 誤指向正式 Turso、幾乎把 seed 假資料灌進正式庫的狀況。
 *
 * 涵蓋範圍：**所有走本檔取得 prisma 實例的路徑**（API route、server component）。
 * 其他路徑不經過本檔，各有自己的守衛——修改任一處前請先確認其他處仍成立：
 *   - Prisma CLI（`npx prisma migrate deploy` / `db push` / `studio` …）
 *       → `prisma.config.ts` 用同一支 `isVercelDeployment()` 做等效檢查
 *   - `prisma/seed.ts`            → 自己的 `file:` 檢查（拒絕寫進遠端庫）
 *   - `scripts/migrate-turso.mjs` → 「拒絕 file:」檢查（方向相反，只准遠端）
 *   - `scripts/seed-turso.mjs`    → 「拒絕 file:」+ 需明示 CONFIRM_SEED_PROD=yes
 *
 * 逃生門：真的需要在本機對正式庫做維護時，臨時設 ALLOW_REMOTE_DB=true，用完立即移除。
 */
function assertLocalDbInDevEnv(url: string): void {
  const isRemote = !url.startsWith('file:')
  const escapeHatch = process.env.ALLOW_REMOTE_DB === 'true'

  if (!isVercelDeployment() && isRemote && escapeHatch) {
    // 逃生門若被寫進 .env 就會永久生效且毫無跡象，因此每次連線都留下警告，
    // 讓「臨時解除」不會在無人察覺的情況下變成常態。
    console.warn(
      `[prisma] ⚠️ ALLOW_REMOTE_DB=true —— 防呆已解除，正在連線遠端資料庫 ${safeHost(url)}。` +
        ' 這應該只是臨時措施，維護完請立即移除此環境變數。',
    )
    return
  }

  if (!isVercelDeployment() && isRemote && !escapeHatch) {
    throw new Error(
      `[prisma] 開發環境禁止連遠端資料庫（偵測到 ${safeHost(url)}）。\n` +
        `  本機 / Codespace 請將 DATABASE_URL 設為 "file:./dev.db"。\n` +
        `  正式資料庫的連線資訊只該存在於 Vercel 的 Environment Variables。\n` +
        `  若確定要在本機操作正式庫，請臨時設 ALLOW_REMOTE_DB=true，用完立即移除。`,
    )
  }
}

function resolveDbUrl(): string {
  const raw = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}`
  if (raw.startsWith('file:') && !raw.startsWith('file:/')) {
    const relative = raw.replace(/^file:/, '')
    return `file:${path.resolve(process.cwd(), relative)}`
  }
  return raw
}

function createPrismaClient() {
  const url = resolveDbUrl()
  assertLocalDbInDevEnv(url)
  const authToken = process.env.DATABASE_AUTH_TOKEN
  const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
