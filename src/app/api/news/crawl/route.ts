import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import type { NewsCategory } from '@/types'

// AI 生成的單篇文章結構（尚未寫入 DB 前）
interface GeneratedArticle {
  category: NewsCategory
  subCategory: string
  title: string
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 驗證 Cron 授權（Vercel Cron 會在 Header 帶 CRON_SECRET）
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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
- summary 60-120 字
- publishedAt 為最近 7 天內的 ISO date string（例如 "2026-05-28T00:00:00.000Z"）
- 內容基於真實的寵物食品安全知識`,
        },
      ],
    })

    // 解析 AI 回傳的純文字 JSON
    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    let parsed: GeneratedResponse
    try {
      parsed = JSON.parse(rawText) as GeneratedResponse
    } catch {
      console.error('POST /api/news/crawl: failed to parse AI response', rawText)
      return NextResponse.json({ error: 'AI response parse failed' }, { status: 502 })
    }

    if (!Array.isArray(parsed.articles)) {
      return NextResponse.json({ error: 'Unexpected AI response shape' }, { status: 502 })
    }

    // 計算近 7 天範圍，用於重複判斷
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    let created = 0
    let skipped = 0

    for (const item of parsed.articles) {
      if (!isValidArticle(item)) {
        skipped++
        continue
      }

      // 近 7 天相同標題視為重複，跳過
      const existing = await prisma.newsArticle.findFirst({
        where: {
          title: item.title,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { id: true },
      })

      if (existing) {
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
    }

    return NextResponse.json({ created, skipped })
  } catch (error) {
    console.error('POST /api/news/crawl error:', error)
    return NextResponse.json({ error: 'Crawl failed' }, { status: 500 })
  }
}
