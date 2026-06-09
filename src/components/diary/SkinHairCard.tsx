'use client'

import React, { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// ─── 共用型別（其他卡片也會引用）────────────────────────────────────────────────

export interface MultiSelectCardProps {
  value: string[]
  onChange: (val: string[]) => void
  photos?: string[]
  onPhotosChange?: (urls: string[]) => void
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

export const CameraIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

export const XSmallIcon = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// 健康卡片右上角的相機圖示為「純裝飾」（待辦 3-9）：保留外觀、移除點擊功能。
// 沿用原本 button 的圓底配色，但改為不可互動的 span。
export const DecorIcon = () => (
  <span
    aria-hidden="true"
    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
  >
    <CameraIcon />
  </span>
)

// ─── 共用照片上傳 hook ─────────────────────────────────────────────────────────

export function usePhotoUpload(photos: string[], onPhotosChange?: (urls: string[]) => void) {
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !onPhotosChange) return
    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json() as { url: string }
          uploaded.push(data.url)
        }
      }
      onPhotosChange([...photos, ...uploaded])
    } catch {
      // 靜默降級
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removePhoto = (idx: number) => {
    if (!onPhotosChange) return
    onPhotosChange(photos.filter((_, i) => i !== idx))
  }

  return { uploading, handleFileChange, removePhoto }
}

// ─── 共用 Pill 元件 ────────────────────────────────────────────────────────────

export interface PillProps {
  icon: React.ReactNode
  label: string
  selected: boolean
  onToggle: () => void
}

export function Pill({ icon, label, selected, onToggle }: PillProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition-all border',
        selected
          ? 'bg-[#C4714A]/10 border-[#C4714A] text-[#C4714A]'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
      )}
    >
      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ─── 共用照片縮圖列 ────────────────────────────────────────────────────────────

export interface PhotoStripProps {
  photos: string[]
  onRemove: (idx: number) => void
}

export function PhotoStrip({ photos, onRemove }: PhotoStripProps) {
  if (!photos.length) return null
  return (
    <div className="flex gap-2 flex-wrap mt-3">
      {photos.map((url, i) => (
        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`照片 ${i + 1}`} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="刪除照片"
          >
            <XSmallIcon />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── 共用照片上傳區（明確入口）─────────────────────────────────────────────────
// 待辦 3-9：右上角相機 icon 改為純裝飾後，上傳改由此處「＋ 新增照片」鈕觸發。
// 沿用原本的上傳流程（hidden file input + handleFileChange）與 PhotoStrip 顯示。

export interface PhotoUploaderProps {
  photos: string[]
  onPhotosChange?: (urls: string[]) => void
}

export function PhotoUploader({ photos, onPhotosChange }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, handleFileChange, removePhoto } = usePhotoUpload(photos, onPhotosChange)

  if (!onPhotosChange) return null

  return (
    <div className="mt-3">
      <PhotoStrip photos={photos} onRemove={removePhoto} />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="mt-3 flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-[#C4714A] hover:text-[#C4714A] transition-colors disabled:opacity-50"
      >
        <CameraIcon size={14} />
        <span>{uploading ? '上傳中…' : '新增照片'}</span>
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
    </div>
  )
}

// ─── 卡片頂列（標題 + 右上 icon 按鈕）────────────────────────────────────────

export interface CardHeaderProps {
  title: string
  iconButton?: React.ReactNode
}

export function CardHeader({ title, iconButton }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-bold text-base text-slate-900">{title}</h3>
      {iconButton}
    </div>
  )
}

// ─── 皮膚毛髮 Pill 圖示 ───────────────────────────────────────────────────────

const I = (paths: React.ReactNode) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
)

// 抓搔：3 道爪痕斜線
const IcoScratch = () => I(<><line x1="7" y1="5" x2="5" y2="19"/><line x1="12" y1="4" x2="10" y2="18"/><line x1="17" y1="5" x2="15" y2="19"/></>)
// 紅疹：數個圓形斑點
const IcoRash = () => I(<><circle cx="8" cy="10" r="2.5"/><circle cx="15" cy="8" r="1.5"/><circle cx="16" cy="15" r="2"/></>)
// 皮屑掉毛：下落短線
const IcoDandruff = () => I(<><line x1="7" y1="3" x2="6" y2="7"/><line x1="12" y1="2" x2="11" y2="6"/><line x1="17" y1="3" x2="16" y2="7"/><line x1="9" y1="10" x2="8" y2="14"/><line x1="14" y1="9" x2="13" y2="13"/></>)
// 傷口結痂：OK繃形狀
const IcoScab = () => I(<><rect x="4" y="9" width="16" height="6" rx="3"/><line x1="11" y1="9" x2="11" y2="15"/><line x1="13" y1="9" x2="13" y2="15"/></>)
// 腫塊突起：半圓拱形
const IcoLump = () => I(<><path d="M4 18 Q4 7 12 7 Q20 7 20 18"/><line x1="4" y1="18" x2="20" y2="18"/></>)
// 體味變重：波浪線（氣味）
const IcoOdor = () => I(<><path d="M6 9 C8 7 10 11 12 9 C14 7 16 11 18 9"/><path d="M6 14 C8 12 10 16 12 14 C14 12 16 16 18 14"/></>)

// ─── 皮膚毛髮 Pill 選項 ────────────────────────────────────────────────────────

const SKIN_OPTIONS = [
  { key: 'scratch',  label: '頻繁抓搔', icon: <IcoScratch /> },
  { key: 'rash',     label: '紅疹發炎', icon: <IcoRash /> },
  { key: 'dandruff', label: '皮屑掉毛', icon: <IcoDandruff /> },
  { key: 'scab',     label: '傷口結痂', icon: <IcoScab /> },
  { key: 'lump',     label: '腫塊突起', icon: <IcoLump /> },
  { key: 'odor',     label: '體味變重', icon: <IcoOdor /> },
]

// ─── SkinHairCard ─────────────────────────────────────────────────────────────

export default function SkinHairCard({ value, onChange, photos = [], onPhotosChange }: MultiSelectCardProps) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key])
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <CardHeader
        title="皮膚毛髮"
        iconButton={<DecorIcon />}
      />

      <div className="flex flex-wrap gap-2">
        {SKIN_OPTIONS.map(opt => (
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
