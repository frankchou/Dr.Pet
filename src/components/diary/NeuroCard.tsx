'use client'

import { CardHeader, MultiSelectCardProps, Pill } from './SkinHairCard'

// 聽診器 icon（複用 RespiratoryCard 相同樣式）
const StethoscopeIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </svg>
)

const NEURO_OPTIONS = [
  { key: 'hotBody',    label: '身體發燙', icon: '🌡' },
  { key: 'coldBody',   label: '身體冰冷', icon: '🌡' },
  { key: 'restless',   label: '坐立難安', icon: '⚡' },
  { key: 'circling',   label: '異常繞圈', icon: '🔄' },
  { key: 'hiding',     label: '躲藏角落', icon: '○' },
  { key: 'seizure',    label: '異常抽搐', icon: '⚡' },
  { key: 'limping',    label: '跛行無力', icon: '🦶' },
]

export default function NeuroCard({ value, onChange }: MultiSelectCardProps) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key])
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <CardHeader
        title="溫控與神經"
        iconButton={
          <div className="w-8 h-8 rounded-full bg-[#C4714A]/10 flex items-center justify-center">
            <StethoscopeIcon />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {NEURO_OPTIONS.map(opt => (
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
