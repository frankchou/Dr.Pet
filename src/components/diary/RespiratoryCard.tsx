'use client'

import React from 'react'
import { CardHeader, MultiSelectCardProps, Pill } from './SkinHairCard'

// 聽診器 icon（橘色，無相機）
const StethoscopeIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </svg>
)

// ─── 呼吸與感官 Pill 圖示 ─────────────────────────────────────────────────────

const I = (paths: React.ReactNode) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
)

// 頻繁打噴嚏：鼻形 + 散射顆粒
const IcoSneeze = () => I(<><path d="M10 3 C8 3 7 5 7 7 C7 10 9 12 12 12 C15 12 17 10 17 7 C17 5 16 3 14 3 Z"/><line x1="18" y1="7" x2="22" y2="5"/><line x1="19" y1="10" x2="23" y2="10"/><line x1="18" y1="13" x2="21" y2="15"/></>)
// 異常流鼻水：水滴下落
const IcoRunnyNose = () => I(<><path d="M10 3 C8 3 7 5 7 7 C7 10 9 12 12 12 C15 12 17 10 17 7 C17 5 16 3 14 3 Z"/><path d="M12 12 L11 16 Q12 18 13 16 Z"/></>)
// 持續性咳嗽：氣流波浪
const IcoCough = () => I(<><path d="M4 8 C6 6 8 10 10 8 C12 6 14 10 16 8 C18 6 20 10 22 8"/><path d="M4 14 C6 12 8 16 10 14 C12 12 14 16 16 14 C18 12 20 16 22 14"/></>)
// 異常大喘氣：大波浪（大吸氣感）
const IcoPanting = () => I(<><path d="M2 10 C5 5 9 15 12 10 C15 5 19 15 22 10"/><path d="M2 17 C5 12 9 22 12 17 C15 12 19 22 22 17"/></>)

const RESPIRATORY_OPTIONS = [
  { key: 'sneeze',    label: '頻繁打噴嚏', icon: <IcoSneeze /> },
  { key: 'runnyNose', label: '異常流鼻水', icon: <IcoRunnyNose /> },
  { key: 'cough',     label: '持續性咳嗽', icon: <IcoCough /> },
  { key: 'panting',   label: '異常大喘氣', icon: <IcoPanting /> },
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
