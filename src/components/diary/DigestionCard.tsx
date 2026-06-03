'use client'

import React, { useRef } from 'react'
import { CameraIcon, CardHeader, MultiSelectCardProps, Pill, PhotoStrip, usePhotoUpload } from './SkinHairCard'

// ─── 消化異常 Pill 圖示 ───────────────────────────────────────────────────────

const I = (paths: React.ReactNode) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
)

// 吐黃水：向上波浪箭頭
const IcoYellowVomit = () => I(<><path d="M5 16 C7 13 9 17 11 14 C13 11 15 15 17 13 C19 11 20 13 20 13"/><polyline points="17 8 20 13 23 8"/></>)
// 吐白沫：氣泡群
const IcoWhiteVomit = () => I(<><circle cx="8" cy="16" r="2"/><circle cx="12" cy="13" r="2.5"/><circle cx="16" cy="16" r="1.5"/><circle cx="10" cy="10" r="1.5"/></>)
// 吐未消化：圓形 + 顆粒感
const IcoUnchewed = () => I(<><circle cx="12" cy="12" r="6"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="11" r="1"/><circle cx="12" cy="14" r="1"/></>)
// 吐毛球：漩渦螺旋
const IcoHairball = () => I(<><path d="M12 5 C17 5 20 8 20 12 C20 16 17 19 13 19 C10 19 8 17 9 15 C10 13 13 13 13 15"/></>)
// 肚子腸鳴：胃形 + 聲音波紋
const IcoGurgle = () => I(<><path d="M8 16 C6 14 6 10 8 8 C10 6 14 6 16 8 C18 10 18 14 16 16 C14 18 10 18 8 16Z"/><path d="M19 9 C21 9 21 12 19 15"/><path d="M21 7 C24 7 24 12 21 17"/></>)
// 異常拱背：背部拱形輪廓
const IcoHunchback = () => I(<><path d="M4 18 L4 15 C4 10 7 7 12 5 C17 3 20 6 20 11 L20 18"/></>)

const DIGESTION_OPTIONS = [
  { key: 'yellowVomit',  label: '吐黃水',    icon: <IcoYellowVomit /> },
  { key: 'whiteVomit',   label: '吐白沫',    icon: <IcoWhiteVomit /> },
  { key: 'unchewed',     label: '吐未消化',  icon: <IcoUnchewed /> },
  { key: 'hairball',     label: '吐毛球',    icon: <IcoHairball /> },
  { key: 'gurgle',       label: '肚子腸鳴',  icon: <IcoGurgle /> },
  { key: 'hunchback',    label: '異常拱背',  icon: <IcoHunchback /> },
]

export default function DigestionCard({ value, onChange, photos = [], onPhotosChange }: MultiSelectCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, handleFileChange, removePhoto } = usePhotoUpload(photos, onPhotosChange)

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key])
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <CardHeader
        title="消化異常"
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
        {DIGESTION_OPTIONS.map(opt => (
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
