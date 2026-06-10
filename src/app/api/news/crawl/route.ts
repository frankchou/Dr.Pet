import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { VET_REFERENCE_SCOPE } from '@/lib/utils'
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
      "publishedAt": string
    }
  ]
}

生成規則：
- 食安警報（2-3篇）：category="food_safety"，subCategory 為「食安通報」或「廠商警告」，isUrgent 較嚴重者標 true，應提及具體成分或檢測標準
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
      },
    })
    created++
    acceptedInBatch.push({ category: item.category, normTitle, topicKey })
  }

  return { created, skipped }
}

// 標記 AI 回傳格式錯誤，讓 handler 回 502 而非 500
class ParseError extends Error {}

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await generateAndStore()
    return NextResponse.json(result)
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
