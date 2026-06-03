import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { NewsCategory } from '@/types'

const VALID_CATEGORIES: NewsCategory[] = ['food_safety', 'danger', 'health']

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
