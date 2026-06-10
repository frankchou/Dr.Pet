import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { parseJson, VET_REFERENCE_SCOPE } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

// demo 帳號回固定示意月摘要（不打 AI）。語氣與 AI 路徑一致：先總結再點觀察重點。
const DEMO_MONTH_SUMMARY =
  '這個月毛孩整體狀況穩定，活力與食慾大多維持在良好範圍，排便也以理想成形為主，是很不錯的一個月。比較需要留意的是中旬有幾天皮膚搔抓略增，建議持續記錄並注意環境清潔。整體而言請保持目前的飲食與作息，並維持每日健康紀錄；若搔抓情形持續或加劇，建議諮詢專業獸醫師。'

// 「正常值白名單」需與前端 MonthHealthOverview 一致：只有非白名單值才算異常觀察。
const VITALITY_NORMAL = new Set(['精神飽滿', '活動意願高'])
const APPETITE_NORMAL = new Set(['胃口極佳', '食慾正常'])
const WATER_NORMAL = new Set(['飲水正常'])
const STOOL_NORMAL = new Set(['正常成形', '羊便便(硬)'])
const URINE_NORMAL = new Set(['尿量正常'])

// 多選觀察欄位與其正常值白名單（情緒含正常值，其餘卡片所有選項皆為異常徵兆）
const MULTI_FIELDS: Array<{ key: string; label: string; normalValues: Set<string> }> = [
  { key: 'mood', label: '情緒行為', normalValues: new Set(['平靜放鬆', '活潑好動']) },
  { key: 'skinHair', label: '皮膚毛髮', normalValues: new Set() },
  { key: 'eyeEar', label: '眼耳', normalValues: new Set() },
  { key: 'dental', label: '牙齒口腔', normalValues: new Set() },
  { key: 'digestion', label: '消化系統', normalValues: new Set() },
  { key: 'respiratory', label: '呼吸', normalValues: new Set() },
  { key: 'neuro', label: '神經溫控', normalValues: new Set() },
  { key: 'reproductive', label: '生殖分泌', normalValues: new Set() },
]

// 後端聚合用的最小化型別（只取會用到的欄位）
interface MonthLog {
  date: string
  appetite: string | null
  waterStatus: string | null
  stoolType: string | null
  urineStatus: string | null
  vitality: string | null
  mood: string
  skinHair: string
  eyeEar: string
  dental: string
  digestion: string
  respiratory: string
  neuro: string
  reproductive: string
}

interface MonthStats {
  healthLogDays: number
  abnormalDays: number
  healthyDays: number
  vitalityDist: Array<[string, number]>
  appetiteDist: Array<[string, number]>
  waterDist: Array<[string, number]>
  stoolDist: Array<[string, number]>
  urineAbnormalDist: Array<[string, number]>
  symptomDist: Array<[string, number]>
}

function abnormalMultiValues(log: MonthLog, field: { key: string; normalValues: Set<string> }): string[] {
  const raw = (log as unknown as Record<string, string>)[field.key]
  return parseJson<string[]>(raw, []).filter(v => !field.normalValues.has(v))
}

function hasAbnormality(log: MonthLog): boolean {
  if (log.vitality && !VITALITY_NORMAL.has(log.vitality)) return true
  if (log.appetite && !APPETITE_NORMAL.has(log.appetite)) return true
  if (log.waterStatus && !WATER_NORMAL.has(log.waterStatus)) return true
  if (log.stoolType && !STOOL_NORMAL.has(log.stoolType)) return true
  if (log.urineStatus && !URINE_NORMAL.has(log.urineStatus)) return true
  return MULTI_FIELDS.some(f => abnormalMultiValues(log, f).length > 0)
}

function countByValue(vals: (string | null)[]): Array<[string, number]> {
  const counts: Record<string, number> = {}
  for (const v of vals) {
    if (v && v.trim()) counts[v] = (counts[v] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

function aggregate(logs: MonthLog[]): MonthStats {
  const healthLogDays = new Set(logs.map(l => l.date)).size
  const abnormalDays = logs.filter(hasAbnormality).length
  const symptomDist: Array<[string, number]> = MULTI_FIELDS
    .map(f => [f.label, logs.filter(l => abnormalMultiValues(l, f).length > 0).length] as [string, number])
    .filter(([, days]) => days > 0)
    .sort((a, b) => b[1] - a[1])

  return {
    healthLogDays,
    abnormalDays,
    healthyDays: healthLogDays - abnormalDays,
    vitalityDist: countByValue(logs.map(l => l.vitality)),
    appetiteDist: countByValue(logs.map(l => l.appetite)),
    waterDist: countByValue(logs.map(l => l.waterStatus)),
    stoolDist: countByValue(logs.map(l => l.stoolType)),
    urineAbnormalDist: countByValue(
      logs.map(l => (l.urineStatus && !URINE_NORMAL.has(l.urineStatus) ? l.urineStatus : null))
    ),
    symptomDist,
  }
}

// 依統計內容算雜湊，作為快取鍵的一部分：統計不變就不重打 AI（避免輪詢燒 token）。
function statsHash(stats: MonthStats): string {
  return createHash('sha1').update(JSON.stringify(stats)).digest('hex').slice(0, 16)
}

// 程序內快取（單機/Serverless 暖實例間有效）。鍵：petId|yearMonth|statsHash。
// 統計一變動 hash 就變、自然失效；避免新增 Prisma model（本期不動 schema/seed）。
// 以 Map 插入序近似 LRU：設上限避免無界成長，超過時刪最舊一筆。
const SUMMARY_CACHE_MAX = 200
const summaryCache = new Map<string, string>()

function setSummaryCache(key: string, summary: string): void {
  // 重新插入讓既有鍵移到隊尾（標記為最近使用）
  if (summaryCache.has(key)) summaryCache.delete(key)
  summaryCache.set(key, summary)
  if (summaryCache.size > SUMMARY_CACHE_MAX) {
    const oldest = summaryCache.keys().next().value
    if (oldest !== undefined) summaryCache.delete(oldest)
  }
}

function distLines(label: string, dist: Array<[string, number]>): string {
  if (dist.length === 0) return `- ${label}：本月無記錄`
  return `- ${label}：${dist.map(([v, d]) => `${v} ${d}天`).join('、')}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('petId')
    const yearMonth = searchParams.get('yearMonth') // YYYY-MM

    if (!petId) return NextResponse.json({ error: 'petId is required' }, { status: 400 })
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json({ error: 'yearMonth (YYYY-MM) is required' }, { status: 400 })
    }

    // pet-scoped → 必須驗權限，且在呼叫 AI 之前先擋掉無權者
    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // demo 帳號：回固定示意摘要，不打 AI。
    if (isDemoUser(session)) {
      return NextResponse.json({ summary: DEMO_MONTH_SUMMARY })
    }

    const logs = (await prisma.dailyHealthLog.findMany({
      where: { petId, date: { gte: `${yearMonth}-01`, lte: `${yearMonth}-31` } },
      orderBy: { date: 'asc' },
    })) as unknown as MonthLog[]

    // 無健康日誌 → 不顯示 AI 解讀（前端據此隱藏該段）
    if (logs.length === 0) {
      return NextResponse.json({ summary: null })
    }

    const stats = aggregate(logs)
    const cacheKey = `${petId}|${yearMonth}|${statsHash(stats)}`
    const cached = summaryCache.get(cacheKey)
    if (cached) {
      // 命中時重新插入以更新 LRU 近因，避免熱門月份被當最舊淘汰
      setSummaryCache(cacheKey, cached)
      return NextResponse.json({ summary: cached, cached: true })
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } })
    const speciesLabel = pet?.species === '貓' ? '貓' : '犬'
    const monthNum = parseInt(yearMonth.split('-')[1], 10)

    const prompt = `你是一位專業的寵物臨床獸醫與飼養顧問。請根據以下「${monthNum} 月健康日誌統計」，為飼主寫一段白話、好懂的健康觀察摘要。
${VET_REFERENCE_SCOPE}

## 寵物基本資料
- 物種：${speciesLabel}
- 名稱：${pet?.name ?? '毛孩'}

## ${monthNum} 月健康日誌統計
- 有健康日誌天數：${stats.healthLogDays} 天
- 狀況良好天數：${stats.healthyDays} 天
- 有異常觀察天數：${stats.abnormalDays} 天
${distLines('活力指數', stats.vitalityDist)}
${distLines('食慾', stats.appetiteDist)}
${distLines('飲水', stats.waterDist)}
${distLines('排便', stats.stoolDist)}
${distLines('泌尿異常', stats.urineAbnormalDist)}
${distLines('症狀觀察部位（出現天數）', stats.symptomDist)}

## 撰寫要求
1. 用平易近人的繁體中文，像在跟飼主聊天，不要條列、不要 markdown，控制在 3～5 句、約 120 字以內。
2. 先總結本月整體狀況，再點出最值得留意的 1～2 個觀察重點（若有異常）。
3. 若整月狀況良好，給予正面肯定並提醒持續紀錄。
4. **非診斷語氣**：不可下診斷、不可斷定疾病；如有明顯異常或持續惡化趨勢，建議「諮詢專業獸醫師」。
5. 只回傳這段摘要文字本身，不要加任何標題、前綴或引號。`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const summary = content.text.trim()
    setSummaryCache(cacheKey, summary)

    return NextResponse.json({ summary, cached: false })
  } catch (error) {
    console.error('GET /api/month-summary error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('credit balance') || msg.includes('insufficient_quota')) {
      return NextResponse.json({ error: 'AI 服務餘額不足' }, { status: 402 })
    }
    if (msg.includes('API key')) {
      return NextResponse.json({ error: 'API Key 未設定' }, { status: 401 })
    }
    return NextResponse.json({ error: '解讀失敗' }, { status: 500 })
  }
}
