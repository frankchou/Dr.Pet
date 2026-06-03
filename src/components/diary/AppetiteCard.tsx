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

// 胃口極佳：閃電
function IconZap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

// 食慾正常：笑臉圓圈
function IconSmileHappy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 13s1.5 3 4 3 4-3 4-3"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  )
}

// 猶豫慢食：中性臉
function IconSmileNeutral() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  )
}

// 挑食偏食：皺眉臉
function IconSmileSad() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M16 16s-1.5-3-4-3-4 3-4 3"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  )
}

// 完全拒食：禁止圓圈
function IconBan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  )
}

interface AppetiteOption {
  value: string
  icon: React.ReactNode
}

const OPTIONS: AppetiteOption[] = [
  { value: '胃口極佳', icon: <IconZap /> },
  { value: '食慾正常', icon: <IconSmileHappy /> },
  { value: '猶豫慢食', icon: <IconSmileNeutral /> },
  { value: '挑食偏食', icon: <IconSmileSad /> },
  { value: '完全拒食', icon: <IconBan /> },
]

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
              {opt.icon}
              {opt.value}
            </button>
          )
        })}
      </div>
    </div>
  )
}
