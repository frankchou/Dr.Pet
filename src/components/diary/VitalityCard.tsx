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

const OPTIONS = [
  { value: '精神飽滿', icon: '☀' },
  { value: '活動意願高', icon: '⚡' },
  { value: '異常疲倦', icon: '🌙' },
] as const

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
