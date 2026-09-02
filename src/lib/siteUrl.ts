import { getAppEnv } from './env'

/**
 * 站台對外絕對網址 —— 給 `metadataBase`（OG / Twitter 卡片圖）與其他需要絕對連結的地方用。
 *
 * 為什麼需要：Next.js 的 metadata 若沒設 metadataBase，相對路徑的 og:image 不會被展開成
 * 絕對網址，LINE / Facebook 的爬蟲抓不到預覽圖（且 build 會出 warning）。
 *
 * 三種環境各取不同來源，環境判斷沿用 `src/lib/env.ts` 的 getAppEnv()：
 *   production  → 自訂網域（NEXT_PUBLIC_SITE_URL / NEXTAUTH_URL）優先，
 *                 再退回 Vercel 的正式網域環境變數。
 *   preview     → 每次部署網址都不同，必須用該次部署的 VERCEL_URL，
 *                 否則預覽圖會指向正式站，測不出這次改動。
 *   development → NEXTAUTH_URL（本機通常是 http://localhost:3000），否則自組 localhost。
 */

const DEV_FALLBACK = `http://localhost:${process.env.PORT ?? 3000}`

/** Vercel 給的 VERCEL_URL 不含 protocol，統一補上並去掉結尾斜線。空值回 null 方便串接 ?? 。 */
function normalizeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '')
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function getSiteUrl(): string {
  const env = getAppEnv()

  if (env === 'preview') {
    return normalizeUrl(process.env.VERCEL_URL)
      ?? normalizeUrl(process.env.NEXTAUTH_URL)
      ?? DEV_FALLBACK
  }

  if (env === 'production') {
    const resolved = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL)
      ?? normalizeUrl(process.env.NEXTAUTH_URL)
      ?? normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
      ?? normalizeUrl(process.env.VERCEL_URL)
    if (resolved) return resolved
    // 正式環境理應至少有 NEXTAUTH_URL（邀請信連結也靠它），缺了要看得見
    console.warn('[siteUrl] 正式環境未設定 NEXTAUTH_URL / NEXT_PUBLIC_SITE_URL，社群分享預覽圖將失效')
    return DEV_FALLBACK
  }

  return normalizeUrl(process.env.NEXTAUTH_URL) ?? DEV_FALLBACK
}
