'use client'

import React from 'react'
import { CardHeader, MultiSelectCardProps, Pill } from './SkinHairCard'

// 聽診器 icon（橘色）
const StethoscopeIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </svg>
)

// ─── 溫控與神經 Pill 圖示 ─────────────────────────────────────────────────────

const I = (paths: React.ReactNode) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
)

// 身體發燙：溫度計 + 向上熱輻射線
const IcoHotBody = () => I(<><line x1="12" y1="4" x2="12" y2="14"/><circle cx="12" cy="17" r="3"/><line x1="16" y1="6" x2="19" y2="3"/><line x1="16" y1="10" x2="20" y2="9"/><line x1="16" y1="14" x2="20" y2="15"/></>)
// 身體冰冷：溫度計 + 雪花
const IcoColdBody = () => I(<><line x1="12" y1="4" x2="12" y2="14"/><circle cx="12" cy="17" r="3"/><line x1="17" y1="5" x2="21" y2="5"/><line x1="19" y1="3" x2="19" y2="7"/><line x1="17" y1="9" x2="21" y2="9"/><line x1="19" y1="7" x2="19" y2="11"/></>)
// 坐立難安：鋸齒形態（不安感）
const IcoRestless = () => I(<><polyline points="2 12 6 6 10 16 14 8 18 14 22 10"/></>)
// 異常繞圈：環形箭頭
const IcoCircling = () => I(<><path d="M12 5 A7 7 0 1 1 5.5 17"/><polyline points="3 14 5.5 17 8 14"/></>)
// 躲藏角落：牆角 + 身體縮入
const IcoHiding = () => I(<><polyline points="4 20 4 4 20 4"/><circle cx="16" cy="16" r="4"/><line x1="13" y1="19" x2="4" y2="20"/></>)
// 異常抽搐：閃電形
const IcoSeizure = () => I(<><polyline points="13 2 7 14 13 14 11 22 17 10 11 10 13 2"/></>)
// 跛行無力：不對稱腳步
const IcoLimping = () => I(<><circle cx="7" cy="8" r="3"/><line x1="7" y1="11" x2="5" y2="20"/><line x1="7" y1="11" x2="9" y2="20"/><circle cx="17" cy="11" r="2"/><line x1="17" y1="13" x2="15" y2="20"/><line x1="17" y1="13" x2="19" y2="20"/></>)

const NEURO_OPTIONS = [
  { key: 'hotBody',    label: '身體發燙', icon: <IcoHotBody /> },
  { key: 'coldBody',   label: '身體冰冷', icon: <IcoColdBody /> },
  { key: 'restless',   label: '坐立難安', icon: <IcoRestless /> },
  { key: 'circling',   label: '異常繞圈', icon: <IcoCircling /> },
  { key: 'hiding',     label: '躲藏角落', icon: <IcoHiding /> },
  { key: 'seizure',    label: '異常抽搐', icon: <IcoSeizure /> },
  { key: 'limping',    label: '跛行無力', icon: <IcoLimping /> },
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
