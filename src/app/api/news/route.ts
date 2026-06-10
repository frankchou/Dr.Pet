import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo'
import type { NewsArticle, NewsCategory } from '@/types'

const VALID_CATEGORIES: NewsCategory[] = ['food_safety', 'danger', 'health']

// demo 帳號的固定示意快訊（不讀 DB / 不打外部）。三分類各數筆，結構與
// NewsArticle 回傳一致（含 id / publishedAt / createdAt）。
const DEMO_NEWS: NewsArticle[] = [
  {
    id: 'demo-news-fs-1',
    category: 'food_safety',
    subCategory: '官方通報',
    title: '食藥署公布最新寵物食品抽驗結果，三款乾糧重金屬超標',
    summary: '本季抽驗市售寵物乾糧 50 件，其中 3 件鎘含量超出標準，已要求業者限期下架回收，飼主可至官網查詢批號。',
    sourceUrl: 'https://www.fda.gov.tw/',
    sourceName: '衛生福利部食品藥物管理署',
    publishedAt: '2026-06-05T00:00:00.000Z',
    isUrgent: true,
    createdAt: '2026-06-05T08:00:00.000Z',
  },
  {
    id: 'demo-news-fs-2',
    category: 'food_safety',
    subCategory: '產品召回',
    title: '某進口主食罐因密封不良啟動預防性召回',
    summary: '進口商主動通報部分批次主食罐出現膨罐情形，為保障毛孩健康啟動預防性召回，購買者可憑發票辦理退換。',
    sourceUrl: 'https://www.fda.gov.tw/',
    sourceName: '進口商公告',
    publishedAt: '2026-05-28T00:00:00.000Z',
    isUrgent: false,
    createdAt: '2026-05-28T09:00:00.000Z',
  },
  {
    id: 'demo-news-danger-1',
    category: 'danger',
    subCategory: '中毒警示',
    title: '提醒：木糖醇對犬隻具高度毒性，慎防誤食無糖口香糖',
    summary: '獸醫師提醒，含木糖醇的無糖口香糖、烘焙食品對狗極危險，誤食可能引發低血糖與肝衰竭，發現後應立即就醫。',
    sourceUrl: 'https://www.avma.org/',
    sourceName: '美國獸醫醫學會 (AVMA)',
    publishedAt: '2026-06-01T00:00:00.000Z',
    isUrgent: true,
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'demo-news-danger-2',
    category: 'danger',
    subCategory: '季節提醒',
    title: '夏季高溫慎防熱衰竭，勿將寵物獨留車內',
    summary: '高溫時段車內溫度可在數分鐘內飆升，短時間就可能造成熱衰竭，外出請避開正午並隨時備水。',
    sourceUrl: 'https://www.avma.org/',
    sourceName: '獸醫臨床提醒',
    publishedAt: '2026-05-30T00:00:00.000Z',
    isUrgent: false,
    createdAt: '2026-05-30T07:00:00.000Z',
  },
  {
    id: 'demo-news-health-1',
    category: 'health',
    subCategory: '營養新知',
    title: 'WSAVA 更新犬貓營養評估指南，強調個體化飲食管理',
    summary: '最新指南建議每次健檢納入營養評估，依年齡、體態與疾病狀況調整飲食，並重視水分攝取與體重管理。',
    sourceUrl: 'https://wsava.org/',
    sourceName: '世界小動物獸醫醫學會 (WSAVA)',
    publishedAt: '2026-06-03T00:00:00.000Z',
    isUrgent: false,
    createdAt: '2026-06-03T11:00:00.000Z',
  },
  {
    id: 'demo-news-health-2',
    category: 'health',
    subCategory: '皮膚保健',
    title: 'Omega-3 補充有助改善過敏性皮膚炎搔抓',
    summary: '臨床研究顯示，適量補充 EPA/DHA 可降低過敏性皮膚炎的搔抓程度，建議搭配獸醫指示與整體飲食調整。',
    sourceUrl: 'https://wsava.org/',
    sourceName: '臨床營養研究摘要',
    publishedAt: '2026-05-25T00:00:00.000Z',
    isUrgent: false,
    createdAt: '2026-05-25T12:00:00.000Z',
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryParam = searchParams.get('category')

    // 驗證 category 參數（若有傳入）
    if (categoryParam && !VALID_CATEGORIES.includes(categoryParam as NewsCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }

    // demo 帳號：回固定示意快訊，不讀 DB。此 endpoint 原本不需登入，故僅為判
    // demo 取 session；無 session（含一般訪客）維持原行為，照讀真實 DB 快訊。
    const session = await auth()
    if (isDemoUser(session)) {
      const demoArticles = categoryParam
        ? DEMO_NEWS.filter((a) => a.category === categoryParam)
        : DEMO_NEWS
      return NextResponse.json(demoArticles)
    }

    const articles = await prisma.newsArticle.findMany({
      where: categoryParam ? { category: categoryParam } : undefined,
      orderBy: { publishedAt: 'desc' },
      take: 20,
    })

    return NextResponse.json(articles)
  } catch (error) {
    console.error('GET /api/news error:', error)
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, subCategory, title, summary, sourceUrl, sourceName, publishedAt, isUrgent } =
      body

    if (!category || !title || !summary) {
      return NextResponse.json(
        { error: 'category, title, and summary are required' },
        { status: 400 },
      )
    }

    if (!VALID_CATEGORIES.includes(category as NewsCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }

    const article = await prisma.newsArticle.create({
      data: {
        category,
        subCategory: subCategory ?? null,
        title,
        summary,
        sourceUrl: sourceUrl ?? null,
        sourceName: sourceName ?? null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        isUrgent: isUrgent ?? false,
      },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('POST /api/news error:', error)
    return NextResponse.json({ error: 'Failed to create news article' }, { status: 500 })
  }
}
