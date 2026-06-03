'use client'

import { CardHeader, MultiSelectCardProps, Pill } from './SkinHairCard'

// 聽診器 icon（橘色，無相機）
const StethoscopeIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </svg>
)

const RESPIRATORY_OPTIONS = [
  { key: 'sneeze',    label: '頻繁打噴嚏', icon: '≈' },
  { key: 'runnyNose', label: '異常流鼻水', icon: '💧' },
  { key: 'cough',     label: '持續性咳嗽', icon: '⚡' },
  { key: 'panting',   label: '異常大喘氣', icon: '≈' },
]

export default function RespiratoryCard({ value, onChange }: MultiSelectCardProps) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key])
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <CardHeader
        title="呼吸與感官"
        iconButton={
          <div className="w-8 h-8 rounded-full bg-[#C4714A]/10 flex items-center justify-center">
            <StethoscopeIcon />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {RESPIRATORY_OPTIONS.map(opt => (
          <Pill
            key={opt.key}
            icon={opt.icon}
            label={opt.label}
            selected={value.includes(opt.key)}
            onToggle={() => toggle(opt.key)}
          />
        ))}
      </div>
    </div>
  )
}
