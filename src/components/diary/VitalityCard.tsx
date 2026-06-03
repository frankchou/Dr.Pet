'use client'

// 活力表現健康卡片：單選 pill，值為 string

interface Props {
  value: string | null
  onChange: (val: string) => void
}

function IconZap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

// 精神飽滿：太陽
function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="4" y2="12"/>
      <line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

// 活動意願高：閃電
function IconZapOption() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

// 異常疲倦：月亮
function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

interface VitalityOption {
  value: string
  icon: React.ReactNode
}

const OPTIONS: VitalityOption[] = [
  { value: '精神飽滿', icon: <IconSun /> },
  { value: '活動意願高', icon: <IconZapOption /> },
  { value: '異常疲倦', icon: <IconMoon /> },
]

export default function VitalityCard({ value, onChange }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#2C1810]">活力表現</h3>
        <IconZap />
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
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
  )
}
