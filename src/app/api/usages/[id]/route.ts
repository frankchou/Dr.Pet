import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePetAccessByRecord } from '@/lib/petAccess'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    const access = await requirePetAccessByRecord('productUsage', id, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json()
    const { frequency, amountLevel, notes } = body

    const usage = await prisma.productUsage.update({
      where: { id },
      data: {
        frequency: frequency !== undefined ? frequency || null : undefined,
        amountLevel: amountLevel !== undefined ? amountLevel || null : undefined,
        notes: notes !== undefined ? notes || null : undefined,
      },
      include: { product: true },
    })

    return NextResponse.json(usage)
  } catch (error) {
    console.error('PUT /api/usages/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    const access = await requirePetAccessByRecord('productUsage', id, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    await prisma.productUsage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/usages/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete usage' }, { status: 500 })
  }
}
