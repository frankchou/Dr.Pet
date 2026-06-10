import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { parseJson } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { requirePetAccess } from '@/lib/petAccess'
import { isDemoUser } from '@/lib/demo'

interface ParsedRecord {
  type: 'symptom' | 'medication' | 'grooming' | 'health_metric' | 'food_note'
  label: string       // 顯示給使用者看的描述
  data: Record<string, unknown>
}

// demo 帳號的固定示意隨記解析結果（不打 AI）。涵蓋症狀 / 健康指標 / 飲食三類，
// 結構與 AI 路徑回傳完全一致；確認後可正常經 PUT 寫入。
const DEMO_DIARY_PARSE: { records: ParsedRecord[]; summary: string } = {
  records: [
    {
      type: 'symptom',
      label: '皮膚搔癢（中等）',
      data: { symptomType: 'skin', severity: 3, notes: '後腿與肚子處反覆搔抓' },
    },
    {
      type: 'health_metric',
      label: '活力正常、飲水量偏低',
      data: { vitality: 'medium', waterIntake: 'low', notes: '今日喝水較少' },
    },
    {
      type: 'food_note',
      label: '飲食備註：鮭魚主食罐 + 少量南瓜',
      data: { notes: '晚餐餵食鮭魚主食罐並加入少量蒸南瓜' },
    },
  ],
  summary: '為你整理到 1 筆皮膚症狀、1 筆健康指標與 1 筆飲食備註。',
}

export async function POST(request: NextRequest) {
  try {
    const { petId, text } = await request.json() as { petId: string; text: string }
    if (!petId || !text?.trim()) {
      return NextResponse.json({ error: 'petId and text required' }, { status: 400 })
    }

    // AI route：先驗權限再呼叫 anthropic，避免無權者燒 token
    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // demo 帳號：回固定示意解析結果，不打 AI。
    if (isDemoUser(session)) {
      return NextResponse.json(DEMO_DIARY_PARSE)
    }

    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { name: true, species: true },
    })

    const prompt = `你是寵物健康日誌助理。使用者輸入了一段關於寵物「${pet?.name ?? ''}」(${pet?.species ?? '犬'})的日常描述，請提取出所有應該記錄的事項。

使用者輸入：「${text}」

請分析並提取以下幾類記錄（只提取有明確提到的）：

1. **症狀/異狀** (symptom)：皮膚搔癢、淚痕、腸胃問題、耳朵、口腔、關節等
2. **用藥/看診** (medication)：打疫苗、驅蟲藥、處方藥、看醫生等
3. **美容** (grooming)：洗澡、剪甲、清耳、剃毛等
4. **健康指標** (health_metric)：體重、食慾、活力、飲水量、大便狀況等
5. **飲食備注** (food_note)：吃了什麼食物、零食、補充品等

回傳 JSON（不含 markdown code block）：
{
  "records": [
    {
      "type": "symptom"|"medication"|"grooming"|"health_metric"|"food_note",
      "label": "簡短說明（給使用者確認用）",
      "data": {
        // symptom: { symptomType: "skin"|"tear"|"digestive"|"oral"|"ear"|"joint"|"other", severity: 1-5, notes: "詳情" }
        // medication: { vaccine?: ["疫苗名"], deworming?: ["藥名"], prescription?: ["藥名"], clinic?: ["醫院/項目"] }
        // grooming: { mode: "home"|"shop"|"full", items: ["洗澡","剪甲",...] }
        // health_metric: { vitality?: "low"|"medium"|"high", waterIntake?: "low"|"medium"|"high", bodyScore?: 1-9, notes?: "" }
        // food_note: { notes: "備注文字" }
      }
    }
  ],
  "summary": "一句話總結提取到什麼"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = parseJson<{ records: ParsedRecord[]; summary: string }>(cleaned, { records: [], summary: '' })

    return NextResponse.json(parsed)
  } catch (e) {
    console.error('diary-parse error:', e)
    return NextResponse.json({ error: String(e), records: [], summary: '' }, { status: 500 })
  }
}

// 確認後實際儲存
export async function PUT(request: NextRequest) {
  try {
    const { petId, records } = await request.json() as { petId: string; records: ParsedRecord[] }
    if (!petId || !records?.length) {
      return NextResponse.json({ error: 'petId and records required' }, { status: 400 })
    }

    const session = await auth()
    const access = await requirePetAccess(petId, session?.user?.id ?? '')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const today = new Date().toISOString().split('T')[0]
    const saved: string[] = []

    for (const rec of records) {
      try {
        if (rec.type === 'symptom') {
          const d = rec.data as { symptomType: string; severity: number; notes?: string }
          await prisma.symptomEntry.create({
            data: {
              petId,
              symptomType: d.symptomType || 'other',
              severity: d.severity || 1,
              notes: d.notes || null,
              photos: '[]',
            },
          })
          saved.push(rec.label)
        } else if (rec.type === 'medication') {
          await prisma.symptomEntry.create({
            data: {
              petId,
              symptomType: 'medication',
              severity: 0,
              notes: JSON.stringify(rec.data),
              photos: '[]',
            },
          })
          saved.push(rec.label)
        } else if (rec.type === 'grooming') {
          await prisma.symptomEntry.create({
            data: {
              petId,
              symptomType: 'grooming',
              severity: 0,
              notes: JSON.stringify(rec.data),
              photos: '[]',
            },
          })
          saved.push(rec.label)
        } else if (rec.type === 'health_metric') {
          const d = rec.data as { vitality?: string; waterIntake?: string; bodyScore?: number }
          await prisma.healthMetric.upsert({
            where: { petId_date: { petId, date: today } },
            update: {
              ...(d.vitality    && { vitality: d.vitality }),
              ...(d.waterIntake && { waterIntake: d.waterIntake }),
              ...(d.bodyScore   && { bodyScore: d.bodyScore }),
            },
            create: {
              petId,
              date: today,
              vitality:    d.vitality    || null,
              waterIntake: d.waterIntake || null,
              bodyScore:   d.bodyScore   || null,
            },
          })
          saved.push(rec.label)
        } else if (rec.type === 'food_note') {
          await prisma.symptomEntry.create({
            data: {
              petId,
              symptomType: 'other',
              severity: 0,
              notes: (rec.data as { notes: string }).notes,
              photos: '[]',
            },
          })
          saved.push(rec.label)
        }
      } catch { /* 單筆失敗不影響其他 */ }
    }

    return NextResponse.json({ saved })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
