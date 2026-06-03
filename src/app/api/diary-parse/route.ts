import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { parseJson } from '@/lib/utils'

interface ParsedRecord {
  type: 'symptom' | 'medication' | 'grooming' | 'health_metric' | 'food_note'
  label: string       // 顯示給使用者看的描述
  data: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const { petId, text } = await request.json() as { petId: string; text: string }
    if (!petId || !text?.trim()) {
      return NextResponse.json({ error: 'petId and text required' }, { status: 400 })
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
