'use client'

import { useRef } from 'react'
import { CameraIcon, CardHeader, MultiSelectCardProps, Pill, PhotoStrip, usePhotoUpload } from './SkinHairCard'

const EYE_EAR_OPTIONS = [
  { key: 'tears',     label: '流淚淚痕', icon: '💧' },
  { key: 'discharge', label: '眼屎增多', icon: '🔄' },
  { key: 'squint',    label: '瞇眼揉臉', icon: '👁' },
  { key: 'headShake', label: '甩頭抓耳', icon: '👂' },
  { key: 'earRed',    label: '耳內紅腫', icon: '○' },
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
