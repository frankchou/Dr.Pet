'use client'

// 食慾咀嚼健康卡片：單選 pill，值為 string

interface Props {
  value: string | null
  onChange: (val: string) => void
}

function IconSteak() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
      <path d="M18 8c0-3.3-2.7-6-6-6S6 4.7 6 8c-2 1-3 3-3 5 0 3 2.2 5 5 5h8c2.8 0 5-2 5-5 0-2-1-4-3-5z"/>
      <path d="M9 13c.5 1 1.5 2 3 2s2.5-1 3-2"/>
    </svg>
  )
}

const OPTIONS = [
  { value: '胃口極佳', icon: '⚡', iconColor: 'text-orange-500' },
  { value: '食慾正常', icon: '😊', iconColor: 'text-green-500' },
  { value: '猶豫慢食', icon: '😐', iconColor: 'text-yellow-500' },
  { value: '挑食偏食', icon: '😟', iconColor: 'text-blue-500' },
  { value: '完全拒食', icon: '⊙', iconColor: 'text-red-500' },
] as const

export default function AppetiteCard({ value, onChange }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#2C1810]">食慾咀嚼</h3>
        <IconSteak />
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
              <span className={isSelected ? '' : opt.iconColor}>{opt.icon}</span>
              {opt.value}
            </button>
          )
        })}
      </div>
    </div>
  )
}
