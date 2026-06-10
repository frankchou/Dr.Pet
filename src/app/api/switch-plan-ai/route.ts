import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { parseJson, VET_REFERENCE_SCOPE } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

// ─── 型別 ────────────────────────────────────────────────────────────────────

const SWITCH_PLAN_TOTAL_DAYS = 14

interface SwitchPlanRequestBody {
  petId: string
  /** 換食計畫已進行到第幾天（1 起算） */
  dayCount: number
}

// AI 回傳結構（與 DietSwitchPlan 三區塊對應）
export interface SwitchPlanSchedule {
  /** 新配方比例 % */
  newPct: number
  /** 舊配方比例 % */
  oldPct: number
  /** 顯示用比例標籤，如 "1:3 (新:舊)" */
  label: string
}

export interface SwitchPlanBodyMetric {
  /** 大便分數 0–7（理想 3–4） */
  stoolScore: number
  stoolStatus: string
  /** 抓癢頻率（次/日） */
  scratchPerDay: number
  scratchTrend: string
  /** 趨勢是否惡化（決定顯示色） */
  scratchWorsening: boolean
}

export interface SwitchPlanVerdict {
  /** suitable=適應良好可考慮晉升、monitor=持續觀察、discard=建議淘汰 */
  status: 'suitable' | 'monitor' | 'discard'
  message: string
}

export interface SwitchPlanResult {
  dayCount: number
  totalDays: number
  schedule: SwitchPlanSchedule
  bodyMetric: SwitchPlanBodyMetric
  verdict: SwitchPlanVerdict
  /** 資料不足以分析時為 true，前端據此顯示降級提示 */
  degraded: boolean
}

// ─── 工具函式 ─────────────────────────────────────────────────────────────────

// 換食 14 天計畫從 0% 線性遞增到 100%，取就近四分位呈現整齊比例（新:舊）
function fallbackSchedule(dayCount: number): SwitchPlanSchedule {
  const ratio = Math.min(1, dayCount / SWITCH_PLAN_TOTAL_DAYS)
  const quarters = Math.round(ratio * 4)
  const map: Record<number, SwitchPlanSchedule> = {
    0: { newPct: 0, oldPct: 100, label: '0:4 (新:舊)' },
    1: { newPct: 25, oldPct: 75, label: '1:3 (新:舊)' },
    2: { newPct: 50, oldPct: 50, label: '1:1 (新:舊)' },
    3: { newPct: 75, oldPct: 25, label: '3:1 (新:舊)' },
    4: { newPct: 100, oldPct: 0, label: '4:0 (新:舊)' },
  }
  return map[quarters]
}

// 資料不足時的降級結果（沿用線性排程，身體監控標示為待觀察）
function degradedResult(dayCount: number): SwitchPlanResult {
  return {
    dayCount,
    totalDays: SWITCH_PLAN_TOTAL_DAYS,
    schedule: fallbackSchedule(dayCount),
    bodyMetric: {
      stoolScore: 0,
      stoolStatus: '尚無足夠日誌',
      scratchPerDay: 0,
      scratchTrend: '資料不足',
      scratchWorsening: false,
    },
    verdict: {
      status: 'monitor',
      message: '近 7 日健康日誌資料不足，請持續記錄排便與皮膚搔抓狀況，AI 才能評估換食適應情形。',
    },
    degraded: true,
  }
}

// demo 帳號回固定示意換食結果（不打 AI）。沿用線性排程算今日比例，
// 身體監控與判定填入代表性「適應良好」內容；結構與 AI 路徑完全一致。
function demoResult(dayCount: number): SwitchPlanResult {
  return {
    dayCount,
    totalDays: SWITCH_PLAN_TOTAL_DAYS,
    schedule: fallbackSchedule(dayCount),
    bodyMetric: {
      stoolScore: 3.5,
      stoolStatus: '形狀理想、軟硬適中',
      scratchPerDay: 1.2,
      scratchTrend: '略微改善',
      scratchWorsening: false,
    },
    verdict: {
      status: 'suitable',
      message:
        '近期排便維持理想成形、搔抓也略有改善，毛孩對新配方適應良好，可依計畫穩定推進比例。請持續記錄排便與皮膚狀況，如有不適請諮詢專業獸醫師。',
    },
    degraded: false,
  }
}

// ─── AI 回傳值驗證 ─────────────────────────────────────────────────────────────
// AI 可能回傳髒值（非數字、和不為 100、非法 enum）。驗證後修正或走既有降級，
// 不直接塞給前端。

const VERDICT_STATUSES = new Set<SwitchPlanVerdict['status']>(['suitable', 'monitor', 'discard'])

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

// schedule：newPct/oldPct 須為數字；和不為 100 時依 newPct 正規化；完全無效則用線性降級排程
function validateSchedule(raw: unknown, dayCount: number): SwitchPlanSchedule {
  if (!raw || typeof raw !== 'object') return fallbackSchedule(dayCount)
  const s = raw as Partial<SwitchPlanSchedule>
  if (!isFiniteNumber(s.newPct) || !isFiniteNumber(s.oldPct)) return fallbackSchedule(dayCount)

  // 以 newPct 為準夾擠到 0–100、四捨五入；oldPct 一律補足為 100-newPct（自然修正和不為 100 的情況）
  const newPct = Math.round(Math.min(100, Math.max(0, s.newPct)))
  const oldPct = 100 - newPct
  const label = typeof s.label === 'string' && s.label.trim()
    ? s.label
    : `${newPct}:${oldPct} (新:舊)`
  return { newPct, oldPct, label }
}

// bodyMetric：數值欄位非數字則補 0、布林非布林則補 false、字串缺漏則補佔位文字
function validateBodyMetric(raw: unknown): SwitchPlanBodyMetric {
  const m = (raw && typeof raw === 'object' ? raw : {}) as Partial<SwitchPlanBodyMetric>
  return {
    stoolScore: isFiniteNumber(m.stoolScore) ? Math.min(7, Math.max(0, m.stoolScore)) : 0,
    stoolStatus: typeof m.stoolStatus === 'string' && m.stoolStatus.trim() ? m.stoolStatus : '資料不足',
    scratchPerDay: isFiniteNumber(m.scratchPerDay) ? Math.max(0, m.scratchPerDay) : 0,
    scratchTrend: typeof m.scratchTrend === 'string' && m.scratchTrend.trim() ? m.scratchTrend : '資料不足',
    scratchWorsening: typeof m.scratchWorsening === 'boolean' ? m.scratchWorsening : false,
  }
}

// verdict：status 限合法 enum，否則降級為 monitor；message 缺漏補佔位文字
function validateVerdict(raw: unknown): SwitchPlanVerdict {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<SwitchPlanVerdict>
  const status = v.status && VERDICT_STATUSES.has(v.status) ? v.status : 'monitor'
  const message = typeof v.message === 'string' && v.message.trim()
    ? v.message
    : '請持續觀察毛孩的換食適應情形，如有不適請諮詢專業獸醫師。'
  return { status, message }
}

// 將近 7 日健康日誌整理為提示文字，給 AI 判讀身體反應
function summarizeLogs(
  logs: Array<{
    date: string
    stoolType: string | null
    stoolDetails: string
    skinHair: string
    digestion: string
    appetite: string | null
    vitality: string | null
  }>
): string {
  return logs
    .map((log) => {
      const stoolDetails = parseJson<string[]>(log.stoolDetails, [])
      const skinHair = parseJson<string[]>(log.skinHair, [])
      const digestion = parseJson<string[]>(log.digestion, [])
      const parts = [
        log.stoolType ? `排便型態：${log.stoolType}` : null,
        stoolDetails.length > 0 ? `排便細節：${stoolDetails.join('、')}` : null,
        skinHair.length > 0 ? `皮膚毛髮：${skinHair.join('、')}` : null,
        digestion.length > 0 ? `消化：${digestion.join('、')}` : null,
        log.appetite ? `胃口：${log.appetite}` : null,
        log.vitality ? `精神：${log.vitality}` : null,
      ].filter(Boolean)
      return `- ${log.date}：${parts.length > 0 ? parts.join('；') : '無特別記錄'}`
    })
    .join('\n')
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as SwitchPlanRequestBody
    const { petId } = body
    const dayCount = Math.min(
      SWITCH_PLAN_TOTAL_DAYS,
      Math.max(1, Math.floor(body.dayCount) || 1),
    )

    if (!petId) {
      return NextResponse.json({ error: 'petId 為必填' }, { status: 400 })
    }

    // pet-scoped AI route：先驗權限再呼叫 anthropic，避免無權者燒 token
    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // demo 帳號：回固定示意結果，不打 AI。
    if (isDemoUser(session)) {
      return NextResponse.json(demoResult(dayCount))
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })

    // 取近 7 日健康日誌（以 date 字串 YYYY-MM-DD 反序取最新 7 筆）
    const logs = await prisma.dailyHealthLog.findMany({
      where: { petId },
      orderBy: { date: 'desc' },
      take: 7,
      select: {
        date: true,
        stoolType: true,
        stoolDetails: true,
        skinHair: true,
        digestion: true,
        appetite: true,
        vitality: true,
      },
    })

    // 降級：日誌少於 3 天不足以判讀趨勢，回傳線性排程 + 待觀察提示
    if (logs.length < 3) {
      return NextResponse.json(degradedResult(dayCount))
    }

    const mainProblems = parseJson<string[]>(pet.mainProblems, [])
    const allergies = pet.allergies ? parseJson<string[]>(pet.allergies, []) : []

    const petText = [
      `名字：${pet.name}`,
      `物種：${pet.species}`,
      pet.breed ? `品種：${pet.breed}` : null,
      pet.weight ? `體重：${pet.weight} kg` : null,
      `主要健康問題：${mainProblems.length > 0 ? mainProblems.join('、') : '無'}`,
      `已知過敏原：${allergies.length > 0 ? allergies.join('、') : '無'}`,
    ].filter(Boolean).join('\n')

    // 日誌以 date 反序，提示給 AI 時翻回正序（由舊到新）以利判讀趨勢
    const logsText = summarizeLogs([...logs].reverse())

    const prompt = `你是獸醫營養師，正在協助一隻寵物進行 ${SWITCH_PLAN_TOTAL_DAYS} 天的漸進式換食計畫（新舊配方比例逐步調整）。
請依「換食進度」與「近日身體反應」判讀，並以 JSON 格式回傳結果。

寵物資訊：
${petText}

換食進度：目前為第 ${dayCount} 天 / 共 ${SWITCH_PLAN_TOTAL_DAYS} 天。

近日健康日誌（由舊到新）：
${logsText}

請回傳以下 JSON 結構（不要加 markdown code block，直接回傳純 JSON）：
{
  "schedule": {
    "newPct": number,
    "oldPct": number,
    "label": string
  },
  "bodyMetric": {
    "stoolScore": number,
    "stoolStatus": string,
    "scratchPerDay": number,
    "scratchTrend": string,
    "scratchWorsening": boolean
  },
  "verdict": {
    "status": "suitable" | "monitor" | "discard",
    "message": string
  }
}

欄位說明：
- schedule：今日建議的新舊配方比例。newPct + oldPct 必須等於 100。若身體反應良好可依進度推進新配方比例；若出現腹瀉/軟便/搔抓加劇等不適，應放慢推進、維持或回退比例。label 以「新:舊」整數比表示，如 "1:3 (新:舊)"。
- bodyMetric.stoolScore：依日誌排便型態換算為 0–7 大便分數（1=極硬羊便、3–4=理想成形、6–7=泥水腹瀉），取近 7 日平均，保留 1 位小數。
- bodyMetric.stoolStatus：一句話描述目前排便狀況（如「形狀理想」「偏軟需留意」）。
- bodyMetric.scratchPerDay：依日誌皮膚搔抓相關記錄估算每日抓癢頻率（次/日），保留 1 位小數；無相關記錄填 0。
- bodyMetric.scratchTrend：搔抓趨勢一句話（如「持平」「略微增加」「明顯改善」）。
- bodyMetric.scratchWorsening：搔抓是否惡化（true=惡化需警示，顯示為紅色）。
- verdict.status：suitable=適應良好、可考慮晉升日常飲食；monitor=持續觀察中；discard=出現明顯不適、建議淘汰並更換。
- verdict.message：2-3 句繁體中文，說明適應情形與下一步建議。

${VET_REFERENCE_SCOPE}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('AI 回傳非文字格式')
    }

    const match = content.text.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('AI 回應無法識別為 JSON 格式')
    }

    let parsed: { schedule?: unknown; bodyMetric?: unknown; verdict?: unknown }
    try {
      parsed = JSON.parse(match[0])
    } catch {
      throw new Error('AI 回應 JSON 格式解析失敗')
    }

    // 驗證 AI 數值：髒值（非數字/和不為 100/非法 enum）走既有降級或正規化，不直接塞給前端
    const result: SwitchPlanResult = {
      dayCount,
      totalDays: SWITCH_PLAN_TOTAL_DAYS,
      schedule: validateSchedule(parsed.schedule, dayCount),
      bodyMetric: validateBodyMetric(parsed.bodyMetric),
      verdict: validateVerdict(parsed.verdict),
      degraded: false,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/switch-plan-ai error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'

    if (msg.includes('credit balance') || msg.includes('insufficient_quota')) {
      return NextResponse.json(
        { error: 'AI 服務餘額不足，請至 console.anthropic.com 加值後再試。' },
        { status: 402 }
      )
    }
    if (msg.includes('API key')) {
      return NextResponse.json({ error: 'API Key 未設定' }, { status: 401 })
    }
    return NextResponse.json({ error: `分析失敗：${msg}` }, { status: 500 })
  }
}
