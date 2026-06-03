'use client'

import React, { useRef } from 'react'
import { CameraIcon, CardHeader, MultiSelectCardProps, Pill, PhotoStrip, usePhotoUpload } from './SkinHairCard'

// ─── 五官健康 Pill 圖示 ───────────────────────────────────────────────────────

const I = (paths: React.ReactNode) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
)

// 流淚淚痕：眼睛 + 水滴
const IcoTears = () => I(<><path d="M2 12 C6 7 18 7 22 12 C18 17 6 17 2 12Z"/><circle cx="12" cy="12" r="3"/><path d="M12 17 L10.5 21 Q12 22.5 13.5 21 Z"/></>)
// 眼屎增多：眼睛 + 側邊粒子
const IcoDischarge = () => I(<><path d="M2 12 C6 7 18 7 22 12 C18 17 6 17 2 12Z"/><circle cx="12" cy="12" r="3"/><line x1="17" y1="9" x2="20" y2="7"/><line x1="17" y1="12" x2="21" y2="12"/><line x1="16" y1="15" x2="19" y2="17"/></>)
// 瞇眼揉臉：半閉的眼形弧線
const IcoSquint = () => I(<><path d="M2 12 C6 9.5 18 9.5 22 12"/><path d="M4 14 C8 16.5 16 16.5 20 14"/></>)
// 甩頭抓耳：耳形 + 動作線
const IcoHeadShake = () => I(<><path d="M9 4 C7 4 5 6 5 10 C5 14 7 18 10 18 L10 16 C8 15 7 13 7 10 C7 7 8 6 9 5 C10 4 10 4 9 4Z"/><line x1="13" y1="7" x2="17" y2="5"/><line x1="14" y1="11" x2="18" y2="10"/><line x1="13" y1="15" x2="17" y2="17"/></>)
// 耳內紅腫：耳形 + 內圈
const IcoEarRed = () => I(<><path d="M9 4 C7 4 5 6 5 10 C5 14 7 18 10 18 L10 16 C8 15 7 13 7 10 C7 7 8 6 9 5 C10 4 10 4 9 4Z"/><circle cx="8" cy="10" r="2"/></>)

const EYE_EAR_OPTIONS = [
  { key: 'tears',     label: '流淚淚痕', icon: <IcoTears /> },
  { key: 'discharge', label: '眼屎增多', icon: <IcoDischarge /> },
  { key: 'squint',    label: '瞇眼揉臉', icon: <IcoSquint /> },
  { key: 'headShake', label: '甩頭抓耳', icon: <IcoHeadShake /> },
  { key: 'earRed',    label: '耳內紅腫', icon: <IcoEarRed /> },
]

export default function EyeEarCard({ value, onChange, photos = [], onPhotosChange }: MultiSelectCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, handleFileChange, removePhoto } = usePhotoUpload(photos, onPhotosChange)

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key])
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <CardHeader
        title="五官健康 (眼耳)"
        iconButton={
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
              aria-label="上傳照片"
            >
              <CameraIcon />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {EYE_EAR_OPTIONS.map(opt => (
          <Pill
            key={opt.key}
            icon={opt.icon}
            label={opt.label}
            selected={value.includes(opt.key)}
            onToggle={() => toggle(opt.key)}
          />
        ))}
      </div>

      <PhotoStrip photos={photos} onRemove={removePhoto} />
    </div>
  )
}
