import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/users?nickname=X  — find or check if user exists
export async function GET(request: NextRequest) {
  try {
    const nickname = request.nextUrl.searchParams.get('nickname')
    if (!nickname) return NextResponse.json({ error: 'nickname required' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { nickname } })
    if (!user) return NextResponse.json(null)
    return NextResponse.json(user)
  } catch (e) {
    console.error('[GET /api/users]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/users  — create or return existing user by nickname
export async function POST(request: NextRequest) {
  try {
    const { nickname } = await request.json()
    if (!nickname?.trim()) return NextResponse.json({ error: 'nickname required' }, { status: 400 })
    const clean = nickname.trim()
    const user = await prisma.user.upsert({
      where: { nickname: clean },
      update: {},
      create: { nickname: clean },
    })
    return NextResponse.json(user)
  } catch (e) {
    console.error('[POST /api/users]', e)
    return NextResponse.json({ error: 'Server error — 請重新整理頁面後再試' }, { status: 500 })
  }
}
