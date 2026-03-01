import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { VET_REFERENCE_SCOPE } from '@/lib/utils'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_TYPES: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg':  'image/jpeg',
  'image/png':  'image/png',
  'image/gif':  'image/gif',
  'image/webp': 'image/webp',
}

// GET: history list for a pet
export async function GET(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId')
    if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })

    const records = await prisma.instantAnalysis.findMany({
      where: { petId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('GET /api/instant-analyze error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST: analyze image + save result
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const petId = formData.get('petId') as string | null

    if (!file || !petId) {
      return NextResponse.json({ error: 'file 和 petId 為必填' }, { status: 400 })
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: '檔案過大，請上傳 20MB 以內的圖片' }, { status: 413 })
    }

    // Load pet context
    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })

    // Recent symptoms (30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentSymptoms = await prisma.symptomEntry.findMany({
      where: { petId, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Pet's fixed + trial product list
    const petProducts = await prisma.petProduct.findMany({
      where: { petId },
      include: { product: true },
    })

    // Build context strings
    const mainProblems: string[] = JSON.parse(pet.mainProblems || '[]')
    const allergies: string[] = JSON.parse(pet.allergies || '[]')
    const speciesLabel = pet.species === '貓' ? '貓' : '狗'

    const symptomsText = recentSymptoms.length > 0
      ? recentSymptoms.map(s => `- ${s.symptomType}（嚴重度 ${s.severity}/5）${s.notes ? '：' + s.notes : ''}`).join('\n')
      : '近 30 天無記錄症狀'

    const fixedProducts = petProducts.filter(p => p.listType === 'fixed')
    const trialProducts = petProducts.filter(p => p.listType === 'trial')
    const productsText = [
      fixedProducts.length > 0 ? '固定使用：' + fixedProducts.map(p => `${p.product.name}${p.product.brand ? `（${p.product.brand}）` : ''}`).join('、') : null,
      trialProducts.length > 0 ? '試用中：' + trialProducts.map(p => `${p.product.name}${p.product.brand ? `（${p.product.brand}）` : ''}`).join('、') : null,
    ].filter(Boolean).join('\n') || '尚未記錄使用產品'

    // Convert image to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const rawType = file.type.toLowerCase()
    const mediaType = ALLOWED_TYPES[rawType] ?? 'image/jpeg'

    const prompt = `你是一位專業的寵物營養師，請分析照片中的寵物食品/零食/保健品的成分標籤，評估這款產品是否適合以下這隻寵物食用。

## 寵物資料
- 物種：${speciesLabel}
- 品種：${pet.breed || '未記錄'}
- 體重：${pet.weight ? `${pet.weight} kg` : '未記錄'}
- 主要健康問題：${mainProblems.length > 0 ? mainProblems.join('、') : '無'}
- 已知過敏原：${allergies.length > 0 ? allergies.join('、') : '無'}

## 近期症狀（最近 30 天）
${symptomsText}

## 目前使用的產品
${productsText}

## 任務
1. 辨識照片中的產品成分標籤
2. 根據寵物的健康狀況、症狀、過敏史，評估這款產品的適合程度
3. 特別注意：有毒成分、過敏原、會加重症狀的成分、與現有產品的相容性

請只回傳 JSON，格式如下：
{
  "verdict": "safe",
  "productName": "從標籤辨識到的產品名稱（若看不出則留空字串）",
  "brandName": "從標籤辨識到的品牌名稱（若看不出則留空字串）",
  "summary": "一句話總結這款產品對此寵物的適合程度",
  "extractedIngredients": ["識別出的主要成分1", "成分2"],
  "concerns": [
    { "ingredient": "成分名稱", "reason": "原因說明" }
  ],
  "positives": [
    { "ingredient": "成分名稱", "reason": "對此寵物的好處" }
  ]
}

verdict 值必須是以下其中一個：
- "safe"：適合，無明顯風險
- "caution"：需謹慎，有些需留意的成分
- "danger"：不建議，有明顯有害成分或強烈過敏風險

${VET_REFERENCE_SCOPE}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI 回應格式錯誤')

    const result = JSON.parse(match[0]) as {
      verdict: string
      productName?: string
      brandName?: string
      summary: string
      extractedIngredients?: string[]
      concerns?: { ingredient: string; reason: string }[]
      positives?: { ingredient: string; reason: string }[]
    }

    // Save image to /public/uploads/
    let imagePath: string | null = null
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadsDir, { recursive: true })
      const ext = rawType.includes('png') ? 'png' : rawType.includes('gif') ? 'gif' : rawType.includes('webp') ? 'webp' : 'jpg'
      const filename = `instant-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes))
      imagePath = `/uploads/${filename}`
    } catch {
      // Image save failure is non-fatal
    }

    // Save to DB
    const saved = await prisma.instantAnalysis.create({
      data: {
        petId,
        verdict: result.verdict || 'caution',
        summary: result.summary || '',
        resultJson: JSON.stringify(result),
        imagePath,
      },
    })

    return NextResponse.json({ ...result, id: saved.id, createdAt: saved.createdAt, imagePath })
  } catch (error) {
    console.error('POST /api/instant-analyze error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('credit balance') || msg.includes('insufficient_quota')) {
      return NextResponse.json({ error: 'AI 服務餘額不足，請至 console.anthropic.com 加值後再試。' }, { status: 402 })
    }
    if (msg.includes('Could not process image') || msg.includes('invalid_request')) {
      return NextResponse.json({ error: '圖片格式不支援，請上傳 JPG、PNG 或 WebP 格式。' }, { status: 400 })
    }
    if (msg.includes('API key')) {
      return NextResponse.json({ error: 'API Key 未設定' }, { status: 401 })
    }
    return NextResponse.json({ error: `分析失敗：${msg}` }, { status: 500 })
  }
}
