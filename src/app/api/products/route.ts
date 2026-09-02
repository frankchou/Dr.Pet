import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Product 是全站共用的產品目錄（schema 無 userId，不屬於任何使用者），
// 因此不做 per-user 過濾；但全部呼叫端都在登入牆之後，故仍採預設拒絕，
// 避免產品目錄被匿名列舉爬取。
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const products = await prisma.product.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { brand: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, name, brand, variant, ingredientText, ingredientJson, photos } = body

    if (!type || !name) {
      return NextResponse.json(
        { error: 'type and name are required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        type,
        name,
        brand: brand || null,
        variant: variant || null,
        ingredientText: ingredientText || null,
        ingredientJson: ingredientJson ? JSON.stringify(ingredientJson) : null,
        photos: JSON.stringify(photos || []),
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
