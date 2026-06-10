import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { sendPushToUser, sendInBatches, type PushPayload } from '@/lib/push'
import { VET_REFERENCE_SCOPE, parseJson } from '@/lib/utils'
import type { NewsCategory } from '@/types'

// AI 生成的單篇文章結構（尚未寫入 DB 前）
interface GeneratedArticle {
  category: NewsCategory
  subCategory: string
  title: string
  // 主題關鍵詞：由 AI 一併輸出，精簡可比對（例：「貓咪百合中毒」），用於跨措辭去重
  topicKey: string
  summary: string
  sourceName: string
  sourceUrl: string | null
  isUrgent: boolean
  publishedAt: string
  // 食安警報涉及的廠商/品牌/產品關鍵詞（其他分類可為空陣列），供個人化頭條比對 PetProduct
  affectedBrands: string[]
}

interface GeneratedResponse {
  articles: GeneratedArticle[]
}

const VALID_CATEGORIES: NewsCategory[] = ['food_safety', 'danger', 'health']

// 驗證 AI 回傳的文章欄位是否合法，避免寫入髒資料
function isValidArticle(item: unknown): item is GeneratedArticle {
  if (!item || typeof item !== 'object') return false
  const a = item as Record<string, unknown>
  return (
    typeof a.category === 'string' &&
    VALID_CATEGORIES.includes(a.category as NewsCategory) &&
    typeof a.title === 'string' &&
    a.title.trim().length > 0 &&
    typeof a.summary === 'string' &&
    a.summary.trim().length > 0
  )
}

// 從 AI 回傳項目萃取 affectedBrands：僅接受非空字串、去重，避免髒資料寫入。
function sanitizeAffectedBrands(item: unknown): string[] {
  const raw = (item as Record<string, unknown>).affectedBrands
  if (!Array.isArray(raw)) return []
  const cleaned = raw
    .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    .map((b) => b.trim())
  return Array.from(new Set(cleaned))
}

// 標題 / 主題正規化：去除標點、空白、全形數字等雜訊，轉小寫，供「同主題不同措辭」比對。
// 僅作為降低重複的啟發式，刻意保守（不過度截斷），避免誤殺正常不同主題的新聞。
function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKC')
    // 移除標點、符號與空白，只留中英數字
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .trim()
}

// 兩個正規化後字串是否「高度相似」：完全相同，或其一為另一的子字串（措辭增刪常見）。
// 設長度下限避免極短字串造成的偶然包含誤判。
function isHighlySimilar(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const minLen = Math.min(a.length, b.length)
  if (minLen < 6) return false
  return a.includes(b) || b.includes(a)
}

// 驗證 Cron 授權：Vercel Cron 會自動在 Header 帶 `Authorization: Bearer <CRON_SECRET>`
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

// AI 偶爾仍會把 JSON 包在 markdown code block 裡，先剝除外層 fence 再 parse
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
}

// 呼叫 AI 生成快訊並寫入 DB，回傳寫入/略過筆數
async function generateAndStore(): Promise<{ created: number; skipped: number }> {
  // 一次 AI call 生成三類文章
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `請以獸醫與寵物食品安全專家的角度，模擬生成以下三類最新寵物食安與健康資訊（使用繁體中文，符合台灣市場）。回傳純 JSON，不加 markdown code block：

{
  "articles": [
    {
      "category": "food_safety"|"danger"|"health",
      "subCategory": string,
      "title": string,
      "topicKey": string,
      "summary": string,
      "sourceName": string,
      "sourceUrl": string|null,
      "isUrgent": boolean,
      "publishedAt": string,
      "affectedBrands": string[]
    }
  ]
}

生成規則：
- 食安警報（2-3篇）：category="food_safety"，subCategory 為「食安通報」或「廠商警告」，isUrgent 較嚴重者標 true，應提及具體成分或檢測標準
- affectedBrands：**僅食安警報（food_safety）需填**，列出該警報「涉及的廠商/品牌/產品關鍵詞」（例：["皇家","Royal Canin","A牌雞肉乾糧"]），供系統比對飼主正在使用的產品；若該警報為通泛成分警示無特定品牌則回 []。其他分類一律回 []
- 危險禁忌（1-2篇）：category="danger"，subCategory 為「地雷食物」或「室內植物」，需有明確的毒性機制說明
- 健康知識（2-3篇）：category="health"，附真實來源機構名稱與網址，引用 AAFCO、AVMA、NRC 等機構
- topicKey：用 4-12 字的精簡主題關鍵詞概括該篇核心主題（例：「貓咪百合中毒」「狗食黃麴毒素超標」），同一主題不同措辭應給相同 topicKey，供系統去重
- summary 60-120 字
- publishedAt 為最近 7 天內的 ISO date string（例如 "2026-05-28T00:00:00.000Z"）
- 內容基於真實的寵物食品安全知識

${VET_REFERENCE_SCOPE}`,
      },
    ],
  })

  // 解析 AI 回傳的純文字 JSON
  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  let parsed: GeneratedResponse
  try {
    parsed = JSON.parse(stripCodeFence(rawText)) as GeneratedResponse
  } catch {
    console.error('news/crawl: failed to parse AI response', rawText)
    throw new ParseError()
  }

  if (!Array.isArray(parsed.articles)) {
    throw new ParseError()
  }

  // 計算近 N 天範圍，用於重複判斷（topic key 在這段期間內仍算「近期已報過」）
  const DEDUP_WINDOW_DAYS = 7
  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - DEDUP_WINDOW_DAYS)

  // 一次撈出近 N 天既有文章並計算正規化標題，避免逐篇查 DB。
  // 注意：NewsArticle 無 topicKey 欄位（不為去重動 schema），故對「既有 DB 文章」
  // 以正規化標題高度相似度比對；topicKey 主要用於同一批次內的同主題不同措辭去重。
  const recent = await prisma.newsArticle.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { category: true, title: true },
  })
  const existingTitles = recent.map(r => ({
    category: r.category,
    normTitle: normalizeForCompare(r.title),
  }))

  let created = 0
  let skipped = 0
  // 同一批次內也要去重，避免 AI 一次回多篇同主題不同措辭
  const acceptedInBatch: Array<{ category: NewsCategory; normTitle: string; topicKey: string }> = []

  for (const item of parsed.articles) {
    if (!isValidArticle(item)) {
      skipped++
      continue
    }

    const normTitle = normalizeForCompare(item.title)
    const topicKey = item.topicKey ? normalizeForCompare(item.topicKey) : ''

    // 與既有 DB 文章比對：同分類且標題正規化後高度相似 → 重複
    const dupInDb = existingTitles.some(
      prev => prev.category === item.category && isHighlySimilar(prev.normTitle, normTitle),
    )
    // 與同批已採用文章比對：同分類且（topic key 相同 或 標題高度相似）→ 重複
    const dupInBatch = acceptedInBatch.some(
      prev =>
        prev.category === item.category &&
        ((topicKey.length > 0 && prev.topicKey === topicKey) || isHighlySimilar(prev.normTitle, normTitle)),
    )

    if (dupInDb || dupInBatch) {
      skipped++
      continue
    }

    const affectedBrands = sanitizeAffectedBrands(item)

    await prisma.newsArticle.create({
      data: {
        category: item.category,
        subCategory: item.subCategory ?? null,
        title: item.title,
        summary: item.summary,
        sourceUrl: item.sourceUrl ?? null,
        sourceName: item.sourceName ?? null,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        isUrgent: item.isUrgent ?? false,
        // 僅食安警報存涉及品牌；其餘分類存 null 省空間
        affectedBrands:
          item.category === 'food_safety' && affectedBrands.length > 0
            ? JSON.stringify(affectedBrands)
            : null,
      },
    })
    created++
    acceptedInBatch.push({ category: item.category, normTitle, topicKey })
  }

  return { created, skipped }
}

// 品牌/產品關鍵詞比對的正規化：轉小寫、NFKC、去標點空白，與標題去重共用同一套規則。
function normalizeKeyword(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .trim()
}

// 個人化比對：使用者「正在使用的產品關鍵詞集合」是否命中該警報「涉及品牌關鍵詞」。
// 採雙向子字串包含（例：警報「皇家」命中產品「皇家成貓飼料」；產品「Royal Canin」命中警報「Royal」）。
// 設長度下限避免極短字串偶然命中。
function brandsHitProducts(alertBrands: string[], productKeywords: string[]): boolean {
  for (const rawBrand of alertBrands) {
    const brand = normalizeKeyword(rawBrand)
    if (brand.length < 2) continue
    for (const kw of productKeywords) {
      if (kw.length < 2) continue
      if (kw === brand || kw.includes(brand) || brand.includes(kw)) return true
    }
  }
  return false
}

// 一般食安推播 payload
function normalFoodAlertPayload(article: { id: string; title: string }): PushPayload {
  return {
    title: '⚠️ 食安警報',
    body: article.title,
    url: `/news?article=${article.id}`,
    tag: `food-alert-${article.id}`,
  }
}

// 個人化頭條 payload：命中飼主正在使用的產品 → 標題前綴 + headline 旗標供 sw.js 顯示更顯眼
function headlineFoodAlertPayload(article: { id: string; title: string }): PushPayload {
  return {
    title: '⚠️ 你的毛孩正在使用的產品',
    body: article.title,
    url: `/news?article=${article.id}`,
    tag: `food-alert-${article.id}`,
    // sw.js 可依此將通知顯示得更顯眼（requireInteraction / renotify）
    priority: 'high',
    headline: true,
  }
}

/**
 * 觸發食安警報推播：
 * 1. 取待推的「緊急食安警報」（category=food_safety AND isUrgent AND foodAlertPushedAt IS NULL）。
 * 2. 取所有開啟食安推播的訂閱者（含 demo；demo 的內容由 push.ts 統一換成 mock）。
 * 3. 為每位訂閱者比對其毛孩正在使用的產品 ∩ 警報涉及品牌 → 命中收頭條、未命中收一般。
 * 4. 每篇推完（即使 0 訂閱）標記 foodAlertPushedAt，保證同篇只推一次。
 * 失效訂閱清除沿用 src/lib/push.ts 既有行為。
 */
async function triggerFoodAlertPush(): Promise<{ articles: number; recipients: number; headlines: number }> {
  const articles = await prisma.newsArticle.findMany({
    where: { category: 'food_safety', isUrgent: true, foodAlertPushedAt: null },
    select: { id: true, title: true, affectedBrands: true },
  })
  if (articles.length === 0) {
    return { articles: 0, recipients: 0, headlines: 0 }
  }

  // 取所有開啟食安推播的訂閱者去重 userId（含 demo；內容由 push.ts 換成 mock）
  const subs = await prisma.pushSubscription.findMany({
    where: { foodAlertEnabled: true },
    select: { userId: true },
  })
  const userIds = Array.from(new Set(subs.map((s) => s.userId)))

  // 預先載入每位訂閱者「正在使用的產品關鍵詞集合」（owner + co_owner 的毛孩、isActive 產品）
  const userProductKeywords = new Map<string, string[]>()
  for (const userId of userIds) {
    const petProducts = await prisma.petProduct.findMany({
      where: {
        isActive: true,
        pet: { OR: [{ userId }, { members: { some: { userId } } }] },
      },
      select: { product: { select: { name: true, brand: true, variant: true } } },
    })
    const keywords = new Set<string>()
    for (const pp of petProducts) {
      for (const field of [pp.product.name, pp.product.brand, pp.product.variant]) {
        if (field) {
          const norm = normalizeKeyword(field)
          if (norm) keywords.add(norm)
        }
      }
    }
    userProductKeywords.set(userId, Array.from(keywords))
  }

  let recipients = 0
  let headlines = 0
  for (const article of articles) {
    const alertBrands = parseJson<string[]>(article.affectedBrands ?? '[]', [])
    // 每位訂閱者分批並行送出（每批上限見 sendInBatches）：單一失敗不影響其他人。
    // headline 命中數另外計：worker 回傳「送達筆數」，命中者把該數累加進 headlines。
    const sent = await sendInBatches(userIds, async (userId) => {
      const productKeywords = userProductKeywords.get(userId) ?? []
      const isHeadline =
        alertBrands.length > 0 && brandsHitProducts(alertBrands, productKeywords)
      const payload = isHeadline
        ? headlineFoodAlertPayload(article)
        : normalFoodAlertPayload(article)
      const delivered = await sendPushToUser(userId, payload, 'foodAlert')
      if (isHeadline) headlines += delivered
      return delivered
    })
    recipients += sent
    // 即使 0 訂閱也標記，避免日後累積誤推
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: { foodAlertPushedAt: new Date() },
    })
  }

  return { articles: articles.length, recipients, headlines }
}

// 標記 AI 回傳格式錯誤，讓 handler 回 502 而非 500
class ParseError extends Error {}

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await generateAndStore()
    // 文章寫入後觸發食安推播；推播失敗不應讓整個 crawl 回錯（文章已成功生成）
    let push: Awaited<ReturnType<typeof triggerFoodAlertPush>> | { error: true } | null = null
    try {
      push = await triggerFoodAlertPush()
    } catch (pushError) {
      console.error('news/crawl food alert push error:', pushError)
      push = { error: true }
    }
    return NextResponse.json({ ...result, push })
  } catch (error) {
    if (error instanceof ParseError) {
      return NextResponse.json({ error: 'AI response parse failed' }, { status: 502 })
    }
    console.error('news/crawl error:', error)
    return NextResponse.json({ error: 'Crawl failed' }, { status: 500 })
  }
}

// Vercel Cron 以 GET 觸發；POST 供手動觸發（兩者皆需 CRON_SECRET 授權）
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request)
}
