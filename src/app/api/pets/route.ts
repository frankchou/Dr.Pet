import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    // 未登入一律 401（不可回空陣列）：where 條件若少了 userId 會退化成全表查詢，
    // 等同對外公開所有毛孩的 allergies / medicalHistory 等健康資料。
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pets = await prisma.pet.findMany({
      // owner（Pet.userId）或 co_owner（PetMember）皆可見；OR + relation filter 不會展開重複 row。
      where: { OR: [{ userId }, { members: { some: { userId } } }] },
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
    // 建檔一律需登入：否則會產生 userId 為 null 的孤兒毛孩，任何人都無法（也不該）存取。
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        userId,
      },
    })

    // 建立 owner 成員紀錄，讓後續 requirePetAccess 的 PetMember 路徑也成立
    await prisma.petMember.create({
      data: { petId: pet.id, userId, role: 'owner' },
    })

    return NextResponse.json(pet, { status: 201 })
  } catch (error) {
    console.error('POST /api/pets error:', error)
    return NextResponse.json({ error: 'Failed to create pet' }, { status: 500 })
  }
}
