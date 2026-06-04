import { prisma } from './prisma'
import { anthropic } from './anthropic'
import { VET_REFERENCE_SCOPE } from './utils'

interface ProcessReactionInput {
  petId: string
  productId: string
  rating: string
  reactionId: string
}

/**
 * 依某筆產品反應產生 / 更新社群推薦。
 *
 * 從 community/trigger route 抽出，讓 reactions POST 可直接在進程內呼叫（不再走 HTTP self-call，
 * 因此 self-call 不會因缺 session 被 401）。權限改由呼叫端（reactions / trigger route）統一把關。
 * 不拋例外——任何失敗都吞掉並記 log，維持原本 fire-and-forget 的容錯語意。
 */
export async function processReactionForCommunity({
  petId,
  productId,
  rating,
  reactionId,
}: ProcessReactionInput): Promise<void> {
  try {
    // good rating：標記為已分享到社群池
    if (rating === 'good') {
      await prisma.productReaction.update({
        where: { id: reactionId },
        data: { sharedAt: new Date() },
      })
      return
    }

    // 只有 bad rating 才尋找替代推薦
    if (rating !== 'bad') return

    // 1. 取得受影響寵物資訊
    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return

    const mainProblems: string[] = JSON.parse(pet.mainProblems || '[]')

    // 2. 找出相似寵物（同物種、主要問題重疊）
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

    // 3. 避免對同一 pet+product 重複建立推薦
    const existingRec = await prisma.communityRec.findFirst({
      where: { forPetId: petId, badProductId: productId, dismissed: false },
    })
    if (existingRec) return

    if (similarPetIds.length > 0) {
      // 4a. 找相似寵物反應良好（已分享至社群）的產品
      const goodReactions = await prisma.productReaction.findMany({
        where: {
          petId: { in: similarPetIds },
          rating: 'good',
          sharedAt: { not: null },
          productId: { not: productId },
        },
        select: { productId: true },
      })

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
        return
      }
    }

    // 4b. 資料稀疏時用 AI 推薦
    const badProduct = await prisma.product.findUnique({ where: { id: productId } })
    if (!badProduct) return

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
    if (!jsonMatch) return

    const { recommendations } = JSON.parse(jsonMatch[0])
    if (!Array.isArray(recommendations)) return

    if (recommendations.length > 0) {
      const rationale = recommendations
        .map((r: { productType: string; focus: string; reason: string }) =>
          `${r.productType}（${r.focus}）— ${r.reason}`
        )
        .join('\n')

      // AI 推薦無真實 productId，以 badProductId 作 placeholder，靠 fromAI + aiRationale 區分
      await prisma.communityRec.create({
        data: {
          forPetId: petId,
          badProductId: productId,
          recommendedProductId: productId,
          symptomTypes: JSON.stringify(mainProblems),
          basedOnCount: 0,
          fromAI: true,
          aiRationale: rationale,
        },
      })
    }
  } catch (e) {
    console.error('[community] processReactionForCommunity', e)
  }
}
