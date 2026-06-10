import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import {
  symptomTypeLabel,
  severityLabel,
  parseJson,
  VET_REFERENCE_SCOPE,
} from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

/**
 * 症狀詳情頁 AI 建議：依該毛孩、該症狀類型的紀錄，產生「可能原因 / 建議做法」。
 *
 * 快取策略（沿用既有 AIInsight 模型，不新增表）：
 * - 每筆建議存成一列 AIInsight，`symptomType` = 該症狀類型。
 * - 以 petId + symptomType + 各紀錄(id/severity/notes/時間) 算出 dataHash，存進 AIInsight 未被本功能使用的
 *   `suspectedTriggers` 欄位（格式 `["__hash__:<hash>"]`）。
 * - GET 進來時先撈該 (petId, symptomType) 最新一列：若 dataHash 相同（無新增/刪除/修改紀錄）→ 直接回快取，
 *   不重打 AI；不同則重新生成並寫入新列。
 * - `?refresh=1` 可強制重生（保留彈性，前端暫未使用）。
 */

const HASH_PREFIX = '__hash__:'

interface AdviceResult {
  possibleCauses: string[]
  recommendedActions: string[]
}

// 由紀錄內容算資料指紋：任何新增/刪除/編輯都會改變雜湊 → 觸發重新生成。
function computeDataHash(
  petId: string,
  symptomType: string,
  entries: Array<{ id: string; severity: number; notes: string | null; createdAt: Date }>
): string {
  const payload = entries
    .map((e) => `${e.id}:${e.severity}:${e.notes ?? ''}:${e.createdAt.getTime()}`)
    .join('|')
  return createHash('sha1').update(`${petId}::${symptomType}::${payload}`).digest('hex')
}

function buildAdvicePayload(causes: string[], actions: string[]): AdviceResult {
  return { possibleCauses: causes, recommendedActions: actions }
}

// demo 帳號回固定示意建議（不打 AI）。結構與 AI 路徑一致，前端不必區分。
const DEMO_ADVICE: AdviceResult = {
  possibleCauses: [
    '飲食成分變動或近期換食，腸胃道一時未適應。',
    '環境過敏原（塵蟎、花粉、清潔劑）或季節交替的刺激。',
    '壓力或作息變化導致免疫與消化狀態波動。',
  ],
  recommendedActions: [
    '維持飲食與作息穩定，先回到原本適應良好的配方並觀察 3～5 天。',
    '每日記錄症狀嚴重度與排便、皮膚狀況，協助辨識誘發因子。',
    '若症狀持續惡化或出現突發腫脹、出血、精神食慾明顯下降，請盡速就醫。',
  ],
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    const symptomType = searchParams.get('symptomType')
    const refresh = searchParams.get('refresh') === '1'

    if (!petId || !symptomType) {
      return NextResponse.json(
        { error: 'petId and symptomType are required' },
        { status: 400 }
      )
    }

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    // demo 帳號：回固定示意建議，不打 AI。
    if (isDemoUser(session)) {
      return NextResponse.json({ advice: DEMO_ADVICE, cached: false })
    }

    const entries = await prisma.symptomEntry.findMany({
      where: { petId, symptomType },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, severity: true, notes: true, createdAt: true },
    })

    if (entries.length === 0) {
      return NextResponse.json({ advice: null, cached: false })
    }

    const dataHash = computeDataHash(petId, symptomType, entries)

    // 快取命中：撈該症狀類型最新一列，雜湊相同就直接回，不打 AI。
    const latest = await prisma.aIInsight.findFirst({
      where: { petId, symptomType },
      orderBy: { createdAt: 'desc' },
    })

    if (!refresh && latest) {
      const storedTriggers = parseJson<string[]>(latest.suspectedTriggers, [])
      const storedHash = storedTriggers
        .find((t) => t.startsWith(HASH_PREFIX))
        ?.slice(HASH_PREFIX.length)

      if (storedHash === dataHash) {
        return NextResponse.json({
          advice: buildAdvicePayload(
            [latest.rationale ?? ''].filter(Boolean) as string[],
            parseJson<string[]>(latest.recommendedActions, [])
          ),
          cached: true,
          createdAt: latest.createdAt,
        })
      }
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })

    const mainProblems = parseJson<string[]>(pet.mainProblems, [])
    const recordsText = [...entries]
      .reverse() // 由舊到新呈現趨勢
      .map(
        (e) =>
          `- ${new Date(e.createdAt).toLocaleDateString('zh-TW')} 嚴重度：${severityLabel(e.severity)}（${e.severity}/5）${e.notes ? ` 備註：${e.notes}` : ''}`
      )
      .join('\n')

    const prompt = `你是一個寵物健康助理。以下是寵物「${pet.name}」在「${symptomTypeLabel(symptomType)}」這個症狀上的歷次紀錄。請根據這些紀錄，整理「可能原因」與「建議做法」。

重要：你提供的是資訊整理與觀察建議，「非醫療診斷」，不能替代獸醫診斷。語氣務必提醒飼主：若症狀嚴重、持續惡化或出現緊急徵兆（突發腫脹、出血、精神食慾明顯下降、持續嘔吐等），請立即帶往獸醫院就醫。
${VET_REFERENCE_SCOPE}

## 寵物資料
- 名稱：${pet.name}
- 物種：${pet.species}
- 品種：${pet.breed || '未知'}
- 性別：${pet.sex}${pet.isNeutered ? '（已結紮）' : ''}
- 體重：${pet.weight ? `${pet.weight} kg` : '未記錄'}
- 主要問題：${mainProblems.length > 0 ? mainProblems.map((p) => symptomTypeLabel(p)).join('、') : '無'}
- 過敏史：${pet.allergies || '無'}
- 病史：${pet.medicalHistory || '無'}

## 「${symptomTypeLabel(symptomType)}」歷次紀錄（由舊到新）
${recordsText}

請以 JSON 格式回答，僅輸出 JSON，不要其他文字：
{
  "possibleCauses": ["可能原因1", "可能原因2", "可能原因3"],
  "recommendedActions": ["建議做法1", "建議做法2", "建議做法3"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    let parsed: AdviceResult
    try {
      const cleaned = content.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      const obj = JSON.parse(cleaned) as Partial<AdviceResult>
      parsed = buildAdvicePayload(
        Array.isArray(obj.possibleCauses) ? obj.possibleCauses : [],
        Array.isArray(obj.recommendedActions) ? obj.recommendedActions : []
      )
    } catch {
      // 解析失敗時退化為純文字塞進可能原因，仍可顯示。
      parsed = buildAdvicePayload([content.text], [])
    }

    // 寫入快取：rationale 存「可能原因」的整段、recommendedActions 存建議；雜湊放 suspectedTriggers。
    const insight = await prisma.aIInsight.create({
      data: {
        petId,
        symptomType,
        suspectedTriggers: JSON.stringify([`${HASH_PREFIX}${dataHash}`]),
        helpfulFactors: '[]',
        confidence: 'low',
        rationale: parsed.possibleCauses.join('\n'),
        recommendedActions: JSON.stringify(parsed.recommendedActions),
      },
    })

    return NextResponse.json({
      advice: parsed,
      cached: false,
      createdAt: insight.createdAt,
    })
  } catch (error) {
    console.error('GET /api/symptoms/advice error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('credit balance is too low') || msg.includes('insufficient_quota')) {
      return NextResponse.json(
        { error: 'AI 服務餘額不足，請至 console.anthropic.com 加值後再試。' },
        { status: 402 }
      )
    }
    if (msg.includes('API key')) {
      return NextResponse.json(
        { error: 'API Key 未設定，請在 .env 填入 ANTHROPIC_API_KEY。' },
        { status: 401 }
      )
    }
    return NextResponse.json({ error: `AI 建議生成失敗：${msg}` }, { status: 500 })
  }
}
