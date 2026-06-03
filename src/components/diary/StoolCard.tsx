'use client'

// 今日排便 + 排便細節健康卡片（兩個子區塊合一）
// value 格式：JSON string of { stoolType: string | null, stoolDetails: string[] }

interface StoolValue {
  stoolType: string | null
  stoolDetails: string[]
}

interface Props {
  value: string | null
  onChange: (val: string) => void
}

function IconCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <circle cx="12" cy="12" r="8"/>
    </svg>
  )
}

function IconPalette() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <circle cx="13.5" cy="6.5" r="0.5" fill="#8B7355"/>
      <circle cx="17.5" cy="10.5" r="0.5" fill="#8B7355"/>
      <circle cx="8.5" cy="7.5" r="0.5" fill="#8B7355"/>
      <circle cx="6.5" cy="12.5" r="0.5" fill="#8B7355"/>
      <path d="M12 2C6.5 2 2 6.5 2 12c0 5.5 4.5 10 10 10 1.7 0 3-1.3 3-3 0-.8-.3-1.5-.8-2.1-.2-.3-.3-.6-.3-.9 0-.8.7-1.5 1.5-1.5H17c2.8 0 5-2.2 5-5 0-5.5-4.5-9-10-9z"/>
    </svg>
  )
}

const STOOL_TYPES = [
  { value: '羊便便(硬)', icon: '⊙' },
  { value: '正常成形', icon: '🦴' },
  { value: '便便偏軟', icon: '☁' },
  { value: '泥水腹瀉', icon: '💧' },
] as const

const STOOL_DETAILS = [
  { value: '帶血(急)', icon: '💧' },
  { value: '帶黏液', icon: '≈' },
  { value: '顏色異常', icon: '🎨' },
  { value: '排便費力', icon: '⊙' },
  { value: '氣味極臭', icon: '≈' },
] as const

function parseStoolValue(raw: string | null): StoolValue {
  if (!raw) return { stoolType: null, stoolDetails: [] }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'object' && parsed !== null && 'stoolType' in parsed && 'stoolDetails' in parsed) {
      return parsed as StoolValue
    }
  } catch { /* ignore */ }
  return { stoolType: null, stoolDetails: [] }
}

export default function StoolCard({ value, onChange }: Props) {
  const current = parseStoolValue(value)

  function emit(patch: Partial<StoolValue>) {
    onChange(JSON.stringify({ ...current, ...patch }))
  }

  function toggleDetail(detail: string) {
    const existing = current.stoolDetails
    const next = existing.includes(detail)
      ? existing.filter((d) => d !== detail)
      : [...existing, detail]
    emit({ stoolDetails: next })
  }

  return (
    <div className="space-y-3">
      {/* 今日排便 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#2C1810]">今日排便</h3>
          <IconCircle />
        </div>
        <div className="flex flex-wrap gap-2">
          {STOOL_TYPES.map((opt) => {
            const isSelected = current.stoolType === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => emit({ stoolType: opt.value })}
                className={`px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isSelected
                    ? 'bg-[#C4714A]/10 border border-[#C4714A] text-[#C4714A]'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {opt.icon} {opt.value}
              </button>
            )
          })}
        </div>
      </div>

      {/* 排便細節（多選） */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#2C1810]">排便細節</h3>
          <IconPalette />
        </div>
        <div className="flex flex-wrap gap-2">
          {STOOL_DETAILS.map((opt) => {
            const isSelected = current.stoolDetails.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleDetail(opt.value)}
                className={`px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isSelected
                    ? 'bg-[#C4714A]/10 border border-[#C4714A] text-[#C4714A]'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {opt.icon} {opt.value}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
