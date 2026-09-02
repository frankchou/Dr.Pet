import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // 不再 include usages：ProductUsage 屬於各毛孩的私人紀錄（petId / notes），
    // 而 Product 是全站共用資料，帶出來等於跨帳號外洩；唯一呼叫端（產品編輯）也用不到。
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(product)
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { type, name, brand, variant, ingredientText, ingredientJson } = body

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(name && { name }),
        brand: brand !== undefined ? brand || null : undefined,
        variant: variant !== undefined ? variant || null : undefined,
        ingredientText: ingredientText !== undefined ? ingredientText || null : undefined,
        ingredientJson:
          ingredientJson !== undefined
            ? ingredientJson
              ? JSON.stringify(ingredientJson)
              : null
            : undefined,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Product 為全站共用資料，刪除會連帶清掉其他飼主的使用紀錄。
    // 在導入產品擁有者模型前，只允許刪除「無人使用」的產品，避免跨帳號破壞。
    const usageCount = await prisma.productUsage.count({ where: { productId: id } })
    const petProductCount = await prisma.petProduct.count({ where: { productId: id } })
    if (usageCount > 0 || petProductCount > 0) {
      return NextResponse.json(
        { error: '此產品已被使用中，無法刪除' },
        { status: 409 }
      )
    }

    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
