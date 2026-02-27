import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')

    const documents = await prisma.document.findMany({
      where: petId ? { petId } : undefined,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('GET /api/documents error:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { petId, type, photos, extractedText, extractedStructured } = body

    if (!petId || !type) {
      return NextResponse.json(
        { error: 'petId and type are required' },
        { status: 400 }
      )
    }

    const document = await prisma.document.create({
      data: {
        petId,
        type,
        photos: JSON.stringify(photos || []),
        extractedText: extractedText || null,
        extractedStructured: extractedStructured
          ? JSON.stringify(extractedStructured)
          : null,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('POST /api/documents error:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}
