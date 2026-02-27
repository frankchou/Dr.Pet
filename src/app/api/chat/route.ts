import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { symptomTypeLabel, severityLabel, productTypeLabel, parseJson, VET_REFERENCE_SCOPE } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })

    const messages = await prisma.chatMessage.findMany({
      where: { petId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true, createdAt: true },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('GET /api/chat error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { petId, messages } = body

    if (!petId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'petId and messages are required' },
        { status: 400 }
      )
    }

    // Fetch pet data
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    })

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    // Fetch recent symptoms (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentSymptoms = await prisma.symptomEntry.findMany({
      where: {
        petId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Fetch recent products
    const recentUsages = await prisma.productUsage.findMany({
      where: {
        petId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
      take: 10,
      include: { product: true },
    })

    const mainProblems = parseJson<string[]>(pet.mainProblems, [])

    // Build system prompt with pet context
    const systemPrompt = `你是一個寵物健康助理。根據飼主提供的症狀記錄和使用產品，用問診方式引導補充資訊，給出觀察建議和改善計畫。重要：你提供的是資訊整理與觀察建議，不能替代獸醫診斷。若症狀嚴重（突發腫脹、出血、精神食慾明顯下降、持續嘔吐）請建議立即就醫。

${VET_REFERENCE_SCOPE}

## 寵物資料
- 名稱：${pet.name}
- 物種：${pet.species}
- 品種：${pet.breed || '未知'}
- 性別：${pet.sex}${pet.isNeutered ? '（已結紮）' : ''}
- 體重：${pet.weight ? `${pet.weight} kg` : '未記錄'}
- 主要問題：${mainProblems.length > 0 ? mainProblems.map((p: string) => symptomTypeLabel(p)).join('、') : '無'}
- 過敏史：${pet.allergies || '無'}
- 病史：${pet.medicalHistory || '無'}

## 近30天症狀記錄
${
  recentSymptoms.length > 0
    ? recentSymptoms
        .map(
          (s) =>
            `- ${new Date(s.createdAt).toLocaleDateString('zh-TW')} ${symptomTypeLabel(s.symptomType)} 嚴重度：${severityLabel(s.severity)}（${s.severity}/5）${s.notes ? ` 備註：${s.notes}` : ''}`
        )
        .join('\n')
    : '（無記錄）'
}

## 近期使用產品
${
  recentUsages.length > 0
    ? recentUsages
        .map(
          (u) =>
            `- ${productTypeLabel(u.product.type)} ${u.product.brand ? u.product.brand + ' ' : ''}${u.product.name}${u.amountLevel ? ` 用量：${u.amountLevel}` : ''}`
        )
        .join('\n')
    : '（無記錄）'
}`

    // Save user message to DB
    const lastUserMsg = messages[messages.length - 1]
    if (lastUserMsg && lastUserMsg.role === 'user') {
      await prisma.chatMessage.create({
        data: {
          petId,
          role: 'user',
          content: lastUserMsg.content,
        },
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Save assistant message to DB
    await prisma.chatMessage.create({
      data: {
        petId,
        role: 'assistant',
        content: content.text,
      },
    })

    return NextResponse.json({ message: content.text })
  } catch (error) {
    console.error('POST /api/chat error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('credit balance is too low') || msg.includes('insufficient_quota')) {
      return NextResponse.json({ error: 'AI 服務餘額不足，請至 console.anthropic.com 加值後再試。' }, { status: 402 })
    }
    if (msg.includes('API key')) {
      return NextResponse.json({ error: 'API Key 未設定，請在 .env 填入 ANTHROPIC_API_KEY。' }, { status: 401 })
    }
    return NextResponse.json({ error: `AI 回應失敗：${msg}` }, { status: 500 })
  }
}
