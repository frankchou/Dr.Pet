import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/pet-products/[id]  — update listType or trialReason
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const updated = await prisma.petProduct.update({
    where: { id },
    data: {
      ...(body.listType !== undefined && { listType: body.listType }),
      ...(body.trialReason !== undefined && { trialReason: body.trialReason }),
    },
    include: { product: true },
  })
  return NextResponse.json(updated)
}

// DELETE /api/pet-products/[id]  — soft-remove (set isActive=false)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.petProduct.update({
    where: { id },
    data: { isActive: false },
  })
  return NextResponse.json({ ok: true })
}
