'use client'

import React from 'react'
import { CardHeader, DecorIcon, MultiSelectCardProps, Pill, PhotoUploader } from './SkinHairCard'

// ─── 牙齒口腔 Pill 圖示 ───────────────────────────────────────────────────────

const I = (paths: React.ReactNode) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
)

// 牙結石：牙齒形 + 橫條（結石層）
const IcoTartar = () => I(<><path d="M8 3 L8 13 C8 17 10 20 12 20 C14 20 16 17 16 13 L16 3 Z"/><line x1="7" y1="9" x2="17" y2="9"/></>)
// 牙齦紅腫：牙齒 + 粗底邊（牙齦）
const IcoGumRed = () => I(<><path d="M9 7 L9 15 C9 18 12 20 12 20 C12 20 15 18 15 15 L15 7 Z"/><path d="M6 7 Q12 5 18 7" strokeWidth={3}/></>)
// 口腔異味：波浪線 + 從嘴發出
const IcoBreath = () => I(<><path d="M8 8 C10 6 12 10 14 8 C16 6 18 10 20 8"/><path d="M6 13 C8 11 10 15 12 13 C14 11 16 15 18 13"/><path d="M8 18 C10 16 12 20 14 18 C16 16 18 20 20 18"/></>)
// 斷牙鬆動：牙齒形 + 裂縫
const IcoBroken = () => I(<><path d="M8 3 L8 13 C8 17 10 20 12 20 C14 20 16 17 16 13 L16 3 Z"/><path d="M12 3 L10 8 L13 11 L11 16" strokeDasharray="0"/></>)
// 異常流口水：嘴唇形 + 水滴
const IcoDrool = () => I(<><path d="M7 9 Q12 6 17 9 Q17 13 12 13 Q7 13 7 9Z"/><path d="M12 13 L11 17 Q12 19 13 17 Z"/></>)

const DENTAL_OPTIONS = [
  { key: 'tartar',  label: '牙結石',    icon: <IcoTartar /> },
  { key: 'gumRed',  label: '牙齦紅腫',  icon: <IcoGumRed /> },
  { key: 'breath',  label: '口腔異味',  icon: <IcoBreath /> },
  { key: 'broken',  label: '斷牙鬆動',  icon: <IcoBroken /> },
  { key: 'drool',   label: '異常流口水', icon: <IcoDrool /> },
]

export default function DentalCard({ value, onChange, photos = [], onPhotosChange }: MultiSelectCardProps) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key])
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <CardHeader
        title="牙齒口腔"
        iconButton={<DecorIcon />}
      />

      <div className="flex flex-wrap gap-2">
        {DENTAL_OPTIONS.map(opt => (
          <Pill
            key={opt.key}
            icon={opt.icon}
            label={opt.label}
            selected={value.includes(opt.key)}
            onToggle={() => toggle(opt.key)}
          />
        ))}
      </div>

      <PhotoUploader photos={photos} onPhotosChange={onPhotosChange} />
    </div>
  )
}
