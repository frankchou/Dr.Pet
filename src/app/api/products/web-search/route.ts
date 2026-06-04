// AI 搜尋寵物食品：使用 Claude 搜尋網路取得真實產品資訊

import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { analyzeIngredients } from '@/lib/ingredientAnalyzer'
import { prisma } from '@/lib/prisma'
import { parseJson } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'

interface WebProduct {
  name: string
  brand: string
  type: string
  description: string
  ingredients: string[]
  is_from_web: boolean
  cautionCount: number
  warningCount: number
  toxicCount: number
  safeCount: number
}

export async function POST(request: NextRequest) {
  try {
    let body: { query: string; petId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
    }

    const { query, petId } = body
    if (!query?.trim()) return NextResponse.json({ products: [] })

    // 取得寵物資訊：帶 petId 時需先驗權限，無權限就忽略 petId 降級為一般搜尋
    // （避免破壞未綁寵物的正常用法，同時擋住用他人 petId 讀取寵物資料的 IDOR）
    let petSymptoms: string[] = []
    let petSpecies = '犬'
    let allowedPetId: string | null = null
    if (petId) {
      const session = await auth()
      const access = await requirePetAccess(petId, session?.user?.id ?? '')
      if (access.ok) allowedPetId = petId
    }
    if (allowedPetId) {
      const pet = await prisma.pet.findUnique({
        where: { id: allowedPetId },
        select: { species: true, mainProblems: true },
      })
      if (pet) {
        petSpecies = pet.species
        const mainProblems = parseJson<string[]>(pet.mainProblems, [])
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const recent = await prisma.symptomEntry.findMany({
          where: { petId: allowedPetId, createdAt: { gte: thirtyDaysAgo } },
          select: { symptomType: true },
        })
        petSymptoms = [...new Set([...mainProblems, ...recent.map(s => s.symptomType)])]
      }
    }

    const prompt = `你是寵物食品專家。請搜尋「${query}」這個寵物食品或用品，找出真實存在的產品資料。

請回傳 JSON 格式（不含 markdown code block）：
{
  "products": [
    {
      "name": "完整產品名稱",
      "brand": "品牌名稱",
      "type": "feed|snack|supplement|wet|dental|shampoo|other",
      "description": "一句話描述此產品",
      "ingredients": ["成分1", "成分2", "成分3", "...（盡量完整列出主要成分）"]
    }
  ]
}

規則：
- 最多回傳 3 個最相關的產品
- 成分請用繁體中文
- type 只能是 feed/snack/supplement/wet/dental/shampoo/other 其中之一
- 如果不確定成分，根據產品類型給出常見成分估計，但要標示 is_estimate: true
- 只回傳有可能真實存在的產品`

    // 使用 web_search 工具讓 Claude 搜尋網路
    type ContentBlock = { type: string; text?: string }
    const messagesParam: Parameters<typeof anthropic.messages.create>[0]['messages'] = [
      { role: 'user', content: prompt }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305' as never, name: 'web_search' }],
      messages: messagesParam,
    })

    // 處理多輪（web search 可能需要多輪）
    let currentResponse = response
    let rounds = 0
    const maxRounds = 3

    while (currentResponse.stop_reason === 'tool_use' && rounds < maxRounds) {
      rounds++
      const toolUseBlocks = currentResponse.content.filter(b => b.type === 'tool_use') as Array<{ type: 'tool_use'; id: string; name: string; input: unknown }>
      const allMessages = [
        ...messagesParam,
        { role: 'assistant' as const, content: currentResponse.content },
        {
          role: 'user' as const,
          content: toolUseBlocks.map(block => ({
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: '已執行搜尋，請根據結果回答。',
          })),
        },
      ]

      currentResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305' as never, name: 'web_search' }],
        messages: allMessages,
      })
    }

    const textBlock = currentResponse.content.find(b => b.type === 'text') as (ContentBlock & { text: string }) | undefined
    if (!textBlock) return NextResponse.json({ products: [] })

    const cleaned = textBlock.text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = parseJson<{ products: Array<{ name: string; brand: string; type: string; description: string; ingredients: string[] }> }>(
      cleaned, { products: [] }
    )

    // 對每個產品做成分風險分析
    const products: WebProduct[] = parsed.products.map(prod => {
      const mockProduct = {
        id: '__web__',
        name: prod.name,
        brand: prod.brand || null,
        type: prod.type || 'other',
        ingredientText: null,
        ingredientJson: JSON.stringify({ ingredients: prod.ingredients || [] }),
      }
      const analysis = analyzeIngredients([mockProduct], petSymptoms, petSpecies)
      return {
        ...prod,
        is_from_web: true,
        cautionCount: analysis.stats.cautionCount,
        warningCount: analysis.stats.warningCount,
        toxicCount:   analysis.stats.toxicCount,
        safeCount:    analysis.stats.safeCount,
      }
    })

    return NextResponse.json({ products })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('web-search error:', e)
    return NextResponse.json({ error: msg, products: [] }, { status: 500 })
  }
}
