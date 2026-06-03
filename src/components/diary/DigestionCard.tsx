'use client'

import { useRef } from 'react'
import { CameraIcon, CardHeader, MultiSelectCardProps, Pill, PhotoStrip, usePhotoUpload } from './SkinHairCard'

const DIGESTION_OPTIONS = [
  { key: 'yellowVomit',  label: '吐黃水',    icon: '💧' },
  { key: 'whiteVomit',   label: '吐白沫',    icon: '☁' },
  { key: 'unchewed',     label: '吐未消化',  icon: '🌀' },
  { key: 'hairball',     label: '吐毛球',    icon: '≈' },
  { key: 'gurgle',       label: '肚子腸鳴',  icon: '≈' },
  { key: 'hunchback',    label: '異常拱背',  icon: '^' },
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
