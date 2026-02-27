import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const pets = await prisma.pet.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(pets)
  } catch (error) {
    console.error('GET /api/pets error:', error)
    return NextResponse.json({ error: 'Failed to fetch pets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!name || !species || !sex) {
      return NextResponse.json(
        { error: 'name, species, sex are required' },
        { status: 400 }
      )
    }

    const pet = await prisma.pet.create({
      data: {
        name,
        species,
        breed: breed || null,
        sex,
        birthday: birthday ? new Date(birthday) : null,
        weight: weight ? parseFloat(weight) : null,
        isNeutered: isNeutered || false,
        allergies: allergies || null,
        medicalHistory: medicalHistory || null,
        mainProblems: JSON.stringify(mainProblems || []),
        avatar: avatar || null,
      },
    })

    return NextResponse.json(pet, { status: 201 })
  } catch (error) {
    console.error('POST /api/pets error:', error)
    return NextResponse.json({ error: 'Failed to create pet' }, { status: 500 })
  }
}
