import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        symptoms: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        productUsages: {
          orderBy: { date: 'desc' },
          take: 10,
          include: { product: true },
        },
      },
    })

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    return NextResponse.json(pet)
  } catch (error) {
    console.error('GET /api/pets/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch pet' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      species,
      breed,
      sex,
      birthday,
      weight,
      isNeutered,
      allergies,
      medicalHistory,
      mainProblems,
      avatar,
    } = body

    const pet = await prisma.pet.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(species && { species }),
        breed: breed !== undefined ? breed || null : undefined,
        ...(sex && { sex }),
        birthday: birthday !== undefined ? (birthday ? new Date(birthday) : null) : undefined,
        weight: weight !== undefined ? (weight ? parseFloat(weight) : null) : undefined,
        isNeutered: isNeutered !== undefined ? isNeutered : undefined,
        allergies: allergies !== undefined ? allergies || null : undefined,
        medicalHistory: medicalHistory !== undefined ? medicalHistory || null : undefined,
        mainProblems: mainProblems !== undefined ? JSON.stringify(mainProblems) : undefined,
        avatar: avatar !== undefined ? avatar || null : undefined,
      },
    })

    return NextResponse.json(pet)
  } catch (error) {
    console.error('PUT /api/pets/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update pet' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.pet.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/pets/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 })
  }
}
