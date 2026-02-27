import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { VET_REFERENCE_SCOPE } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { petId, productId, rating, reactionId } = await request.json()

    // If good rating: mark as shared to community pool
    if (rating === 'good') {
      await prisma.productReaction.update({
        where: { id: reactionId },
        data: { sharedAt: new Date() },
      })
      return NextResponse.json({ ok: true })
    }

    // If bad rating: find community recommendations
    if (rating !== 'bad') return NextResponse.json({ ok: true })

    // 1. Get the affected pet info
    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return NextResponse.json({ ok: true })

    const mainProblems: string[] = JSON.parse(pet.mainProblems || '[]')

    // 2. Find similar pets (same species, overlapping mainProblems)
    const allPets = await prisma.pet.findMany({
      where: { species: pet.species, id: { not: petId } },
      select: { id: true, mainProblems: true },
    })
    const similarPetIds = allPets
      .filter((p) => {
        const problems: string[] = JSON.parse(p.mainProblems || '[]')
        return problems.some((prob) => mainProblems.includes(prob))
      })
      .map((p) => p.id)

    // 3. Check for existing recs already created for this pet+product pair
    const existingRec = await prisma.communityRec.findFirst({
      where: { forPetId: petId, badProductId: productId, dismissed: false },
    })
    if (existingRec) return NextResponse.json({ ok: true })

    if (similarPetIds.length > 0) {
      // 4a. Find products that similar pets reacted well to (shared to community)
      const goodReactions = await prisma.productReaction.findMany({
        where: {
          petId: { in: similarPetIds },
          rating: 'good',
          sharedAt: { not: null },
          productId: { not: productId },
        },
        select: { productId: true },
      })

      // Count frequency
      const counts: Record<string, number> = {}
      for (const r of goodReactions) {
        counts[r.productId] = (counts[r.productId] || 0) + 1
      }

      const ranked = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .filter(([, count]) => count >= 2)

      if (ranked.length > 0) {
        for (const [recProductId, count] of ranked) {
          await prisma.communityRec.create({
            data: {
              forPetId: petId,
              badProductId: productId,
              recommendedProductId: recProductId,
              symptomTypes: JSON.stringify(mainProblems),
              basedOnCount: count,
              fromAI: false,
            },
          })
        }
        return NextResponse.json({ ok: true })
      }
    }

    // 4b. Fallback: AI recommendation (sparse data)
    const badProduct = await prisma.product.findUnique({ where: { id: productId } })
    if (!badProduct) return NextResponse.json({ ok: true })

    const speciesLabel = pet.species === 'cat' ? '貓' : '狗'
    const problemsLabel = mainProblems.length > 0 ? mainProblems.join('、') : '一般健康'

    const prompt = `你是一位寵物營養師，正在協助一位飼主。
${VET_REFERENCE_SCOPE}
寵物資訊：${speciesLabel}，主要健康問題：${problemsLabel}
使用產品「${badProduct.name}」（${badProduct.type}）後反應不好。
社群中尚無足夠同類型寵物的反饋資料。

請根據寵物醫學知識，推薦 1-2 個替代產品方向（不是具體品牌，而是成分/類型方向）。
僅回覆 JSON，格式：
{ "recommendations": [{ "productType": "飼料/零食/補充品", "focus": "主要成分或特性", "reason": "為什麼適合" }] }`

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ ok: true })

    const { recommendations } = JSON.parse(jsonMatch[0])
    if (!Array.isArray(recommendations)) return NextResponse.json({ ok: true })

    // For AI recs, we create a rec pointing to a placeholder product
    // We'll store the rationale directly instead of a real productId
    // Use a simple "AI suggestion" marker by storing the bad product itself as recommended
    // but marking fromAI=true with the rationale
    if (recommendations.length > 0) {
      const rationale = recommendations
        .map((r: { productType: string; focus: string; reason: string }) =>
          `${r.productType}（${r.focus}）— ${r.reason}`
        )
        .join('\n')

      await prisma.communityRec.create({
        data: {
          forPetId: petId,
          badProductId: productId,
          recommendedProductId: productId, // placeholder (will use aiRationale instead)
          symptomTypes: JSON.stringify(mainProblems),
          basedOnCount: 0,
          fromAI: true,
          aiRationale: rationale,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[community/trigger]', e)
    return NextResponse.json({ ok: true }) // always return ok — fire-and-forget
  }
}
