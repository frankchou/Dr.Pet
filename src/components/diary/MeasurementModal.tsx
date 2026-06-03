'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// ─── 型別 ──────────────────────────────────────────────────────────────────────

interface Props {
  petId: string
  date: string
  onClose: () => void
  onSaved: () => void
}

type BodyCondition = 'thin' | 'normal' | 'heavy'
type BloodSugarTiming = '空腹' | '飯後2hr' | '打胰島素後'
type TempMethod = '肛溫' | '耳溫' | '腋溫'

// ─── inline SVG ────────────────────────────────────────────────────────────────

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const WaveformIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
)

const Spinner = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
)

// ─── 常數 ──────────────────────────────────────────────────────────────────────

const BODY_CONDITIONS: Array<{ value: BodyCondition; label: string }> = [
  { value: 'thin',   label: '體態偏瘦' },
  { value: 'normal', label: '體態標準' },
  { value: 'heavy',  label: '體態豐腴' },
]

const BLOOD_SUGAR_TIMINGS: BloodSugarTiming[] = ['空腹', '飯後2hr', '打胰島素後']

const TEMP_METHODS: TempMethod[] = ['肛溫', '耳溫', '腋溫']

// 與 API body 欄位相符的 bodyCondition 值映射
const BODY_CONDITION_API: Record<BodyCondition, string> = {
  thin:   'thin',
  normal: 'normal',
  heavy:  'heavy',
}

// ─── 小工具：Tab 選擇器 ───────────────────────────────────────────────────────

function TabSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-slate-100 p-1 rounded-full gap-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'flex-1 py-1.5 px-2 rounded-full text-xs font-bold transition-all',
            value === opt ? 'bg-[#C4714A] text-white' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── 主元件 ────────────────────────────────────────────────────────────────────

export default function MeasurementModal({ petId, date, onClose, onSaved }: Props) {
  const [weightKg, setWeightKg]             = useState('')
  const [bodyCondition, setBodyCondition]   = useState<BodyCondition | null>(null)
  const [rrr, setRrr]                       = useState('')
  const [bloodSugarTiming, setBloodSugarTiming] = useState<BloodSugarTiming | null>(null)
  const [bloodSugarMgdl, setBloodSugarMgdl] = useState('')
  const [bloodPressureSys, setBloodPressureSys] = useState('')
  const [bloodPressureDia, setBloodPressureDia] = useState('')
  const [tempMethod, setTempMethod]         = useState<TempMethod | null>(null)
  const [tempCelsius, setTempCelsius]       = useState('')
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')

  const parseNum = (v: string): number | undefined => {
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  const handleSubmit = async () => {
    if (!petId) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/measurement-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          date,
          weightKg:         parseNum(weightKg),
          bodyCondition:    bodyCondition ? BODY_CONDITION_API[bodyCondition] : undefined,
          rrr:              parseNum(rrr),
          bloodSugarTiming: bloodSugarTiming ?? undefined,
          bloodSugarMgdl:   parseNum(bloodSugarMgdl),
          bloodPressureSys: parseNum(bloodPressureSys),
          bloodPressureDia: parseNum(bloodPressureDia),
          tempMethod:       tempMethod ?? undefined,
          tempCelsius:      parseNum(tempCelsius),
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? '儲存失敗')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl overflow-y-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3E8' }}>
              <WaveformIcon />
            </div>
            <span className="font-bold text-lg text-[#2C1810]">量測與追蹤</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="關閉"
          >
            <XIcon />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-6">
          {/* 體重 */}
          <div className="pt-4">
            <p className="text-sm font-bold text-slate-700 mb-2">體重</p>
            <div className="relative flex items-center">
              <input
                type="number"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="5.2"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-2xl font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300 pr-16"
              />
              <span className="absolute right-4 text-sm font-bold text-slate-400">KG</span>
            </div>
          </div>

          {/* 體態 */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">體態評估</p>
            <div className="flex gap-2">
              {BODY_CONDITIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setBodyCondition(bodyCondition === value ? null : value)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                    bodyCondition === value
                      ? 'border-[#C4714A] text-[#C4714A] bg-[#FEF3E8]'
                      : 'border-slate-200 text-slate-500 bg-slate-50 hover:border-slate-300',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 慢性病監測 */}
          <div>
            <p className="text-base font-bold text-[#2C1810] mb-4">慢性病監測</p>

            {/* 靜止呼吸率 */}
            <div className="mb-5">
              <div className="flex items-baseline justify-between mb-1.5">
                <p className="text-sm font-bold text-slate-700">靜止呼吸率（RRR）</p>
                <span className="text-xs text-slate-400 font-medium">熟睡靜止時量測</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="number"
                  inputMode="numeric"
                  value={rrr}
                  onChange={(e) => setRrr(e.target.value)}
                  placeholder="— — —"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300 pr-16"
                />
                <span className="absolute right-4 text-xs font-bold text-slate-400">次/分</span>
              </div>
            </div>

            {/* 血糖量測 */}
            <div className="mb-5">
              <p className="text-sm font-bold text-slate-700 mb-2">血糖量測</p>
              <TabSelector<BloodSugarTiming>
                options={BLOOD_SUGAR_TIMINGS}
                value={bloodSugarTiming}
                onChange={setBloodSugarTiming}
              />
              <div className="mt-2 relative flex items-center">
                <input
                  type="number"
                  inputMode="numeric"
                  value={bloodSugarMgdl}
                  onChange={(e) => setBloodSugarMgdl(e.target.value)}
                  placeholder="血糖數值"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300 pr-16"
                />
                <span className="absolute right-4 text-xs font-bold text-slate-400">mg/dL</span>
              </div>
            </div>

            {/* 血壓量測 */}
            <div className="mb-5">
              <p className="text-sm font-bold text-slate-700 mb-2">血壓量測</p>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={bloodPressureSys}
                    onChange={(e) => setBloodPressureSys(e.target.value)}
                    placeholder="收縮壓"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">SYS</span>
                </div>
                <div className="flex items-center text-slate-300 font-bold text-lg">/</div>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={bloodPressureDia}
                    onChange={(e) => setBloodPressureDia(e.target.value)}
                    placeholder="舒張壓"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">DIA</span>
                </div>
              </div>
            </div>

            {/* 體溫量測 */}
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">體溫量測</p>
              <TabSelector<TempMethod>
                options={TEMP_METHODS}
                value={tempMethod}
                onChange={setTempMethod}
              />
              <div className="mt-2 relative flex items-center">
                <input
                  type="number"
                  inputMode="decimal"
                  value={tempCelsius}
                  onChange={(e) => setTempCelsius(e.target.value)}
                  placeholder="38.5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300 pr-12"
                />
                <span className="absolute right-4 text-xs font-bold text-slate-400">°C</span>
              </div>
            </div>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <p className="text-xs font-bold text-red-500 text-center">{error}</p>
          )}

          {/* 完成紀錄 */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              'w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors',
              saving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#111111] text-white hover:bg-black',
            )}
          >
            {saving ? <Spinner /> : '完成紀錄'}
          </button>
        </div>
      </div>
    </div>
  )
}
