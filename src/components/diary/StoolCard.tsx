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

// 羊便便(硬)：圓圈禁止（硬顆粒狀）
function IconDotCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

// 正常成形：骨頭
function IconBone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M9 3a2 2 0 0 0-2 2c0 .6.2 1.1.6 1.4L4.4 9.6A2 2 0 0 0 3 9a2 2 0 0 0 0 4 2 2 0 0 0 1.4-.6l3.2 3.2A2 2 0 0 0 7 17a2 2 0 0 0 4 0 2 2 0 0 0-.6-1.4l3.2-3.2c.3.4.8.6 1.4.6a2 2 0 0 0 0-4 2 2 0 0 0-1.4.6L10.4 6.4C10.8 6.1 11 5.6 11 5a2 2 0 0 0-2-2z"/>
    </svg>
  )
}

// 便便偏軟：雲朵
function IconCloud() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  )
}

// 泥水腹瀉：水滴
function IconDroplet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  )
}

// 帶血(急)：心跳/脈搏
function IconHeartPulse() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

// 帶黏液：波浪線
function IconWavy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9 13.5 6 15 6s3 3 4.5 3S22 7.5 22 7.5"/>
    </svg>
  )
}

// 顏色異常：調色盤（眼睛）
function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

// 排便費力：扳手
function IconWrench() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}

// 氣味極臭：風/吹氣
function IconWind() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
    </svg>
  )
}

interface StoolTypeOption {
  value: string
  icon: React.ReactNode
}

interface StoolDetailOption {
  value: string
  icon: React.ReactNode
}

const STOOL_TYPES: StoolTypeOption[] = [
  { value: '羊便便(硬)', icon: <IconDotCircle /> },
  { value: '正常成形', icon: <IconBone /> },
  { value: '便便偏軟', icon: <IconCloud /> },
  { value: '泥水腹瀉', icon: <IconDroplet /> },
]

const STOOL_DETAILS: StoolDetailOption[] = [
  { value: '帶血(急)', icon: <IconHeartPulse /> },
  { value: '帶黏液', icon: <IconWavy /> },
  { value: '顏色異常', icon: <IconEye /> },
  { value: '排便費力', icon: <IconWrench /> },
  { value: '氣味極臭', icon: <IconWind /> },
]

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
