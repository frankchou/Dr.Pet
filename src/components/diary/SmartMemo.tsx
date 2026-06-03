'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface ParsedRecord {
  type: 'symptom' | 'medication' | 'grooming' | 'health_metric' | 'food_note'
  label: string
  data: Record<string, unknown>
}

interface HealthLogPatch {
  vitality?: string | null
  waterStatus?: string | null
  waterMl?: number | null
  appetite?: string | null
  urineStatus?: string | null
}

interface Props {
  petId: string
  date: string
  onApplyToLog: (patch: HealthLogPatch) => void
}

// health_metric data → health log field 對照表
function mapToHealthLog(records: ParsedRecord[]): HealthLogPatch {
  const patch: HealthLogPatch = {}
  for (const rec of records) {
    if (rec.type !== 'health_metric') continue
    const d = rec.data as Record<string, string | number>

    if (d.vitality) {
      patch.vitality =
        d.vitality === 'high' ? '精神飽滿' :
        d.vitality === 'medium' ? '活動意願高' :
        '異常疲倦'
    }
    if (d.waterIntake) {
      patch.waterStatus =
        d.waterIntake === 'high' ? '異常狂喝' :
        d.waterIntake === 'medium' ? '飲水正常' :
        '幾乎沒喝'
    }
    if (d.appetite) {
      patch.appetite =
        d.appetite === 'high' ? '胃口極佳' :
        d.appetite === 'medium' ? '食慾正常' :
        d.appetite === 'low' ? '完全拒食' :
        '猶豫慢食'
    }
  }
  return patch
}

const TAG_COLOR: Record<string, string> = {
  symptom:       'bg-red-50 text-red-600 border-red-200',
  medication:    'bg-purple-50 text-purple-600 border-purple-200',
  grooming:      'bg-blue-50 text-blue-600 border-blue-200',
  health_metric: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  food_note:     'bg-amber-50 text-amber-600 border-amber-200',
}

const MicIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8"  y1="23" x2="16" y2="23"/>
  </svg>
)

const SparkleIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
  </svg>
)

export default function SmartMemo({ petId, date, onApplyToLog }: Props) {
  const [text, setText]       = useState('')
  const [tags, setTags]       = useState<ParsedRecord[]>([])
  const [tagging, setTagging] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 文字變動後 debounce 800ms 自動打標籤
  const autoTag = useCallback(async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed || !petId) { setTags([]); return }
    setTagging(true)
    try {
      const res = await fetch('/api/diary-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, text: trimmed }),
      })
      const data = await res.json() as { records: ParsedRecord[] }
      setTags(data.records ?? [])
    } catch { setTags([]) }
    finally { setTagging(false) }
  }, [petId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim()) { setTags([]); return }
    debounceRef.current = setTimeout(() => autoTag(text), 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [text, autoTag])

  // 立即記錄與分析
  async function handleCommit() {
    if (!tags.length || !petId || saving) return
    setSaving(true)
    try {
      // 1. auto-fill health log 欄位
      const logPatch = mapToHealthLog(tags)
      if (Object.keys(logPatch).length > 0) onApplyToLog(logPatch)

      // 2. 儲存到 DB（diary-parse PUT）
      await fetch('/api/diary-parse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, records: tags }),
      })

      // 3. 也更新 daily-health-log 的欄位
      if (Object.keys(logPatch).length > 0) {
        await fetch('/api/daily-health-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ petId, date, ...logPatch }),
        })
      }

      setSaved(true)
      setText('')
      setTags([])
      setTimeout(() => setSaved(false), 2500)
    } catch { /* 靜默 */ }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <h2 className="font-bold text-[#2C1810] mb-3">AI 隨記</h2>

      {/* 輸入區 */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false) }}
          placeholder={`例如：『布丁今天大便很漂亮，但下午有點抓癢...』`}
          rows={4}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-12 text-sm font-medium resize-none focus:outline-none focus:border-[#C4714A]/40 transition-all placeholder:text-slate-400"
        />
        {/* 語音按鈕（預留，尚未實作） */}
        <button
          type="button"
          disabled
          aria-label="語音輸入（即將開放）"
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 cursor-not-allowed"
        >
          <MicIcon />
        </button>
      </div>

      {/* 字數 */}
      <div className="flex justify-end mt-1 mb-2">
        <span className="text-xs text-slate-400">{text.length} 字</span>
      </div>

      {/* 自動標籤區 */}
      {(tagging || tags.length > 0) && (
        <div className="mb-3">
          {tagging ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <SparkleIcon />
              <span>AI 自動貼標中…</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${TAG_COLOR[tag.type] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 立即記錄與分析 按鈕 */}
      {tags.length > 0 && !tagging && (
        <button
          onClick={handleCommit}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <SparkleIcon />
          {saving ? '記錄中…' : '立即記錄與分析'}
        </button>
      )}

      {/* 成功提示 */}
      {saved && (
        <div className="mt-2 text-center text-xs text-emerald-600 font-medium animate-in fade-in">
          ✅ 已自動填入健康紀錄並儲存
        </div>
      )}
    </div>
  )
}
