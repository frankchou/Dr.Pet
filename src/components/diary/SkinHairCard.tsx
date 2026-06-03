'use client'

import { useRef, useState } from 'react'
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
  icon: string
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
      <span>{icon}</span>
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

// ─── 皮膚毛髮 Pill 選項 ────────────────────────────────────────────────────────

const SKIN_OPTIONS = [
  { key: 'scratch',  label: '頻繁抓搔', icon: '🖐' },
  { key: 'rash',     label: '紅疹發炎', icon: '🔲' },
  { key: 'dandruff', label: '皮屑掉毛', icon: '✨' },
  { key: 'scab',     label: '傷口結痂', icon: '🏷' },
  { key: 'lump',     label: '腫塊突起', icon: '⊙' },
  { key: 'odor',     label: '體味變重', icon: '≈'  },
]

// ─── SkinHairCard ─────────────────────────────────────────────────────────────

export default function SkinHairCard({ value, onChange, photos = [], onPhotosChange }: MultiSelectCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, handleFileChange, removePhoto } = usePhotoUpload(photos, onPhotosChange)

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key])
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <CardHeader
        title="皮膚毛髮"
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

      <PhotoStrip photos={photos} onRemove={removePhoto} />
    </div>
  )
}
