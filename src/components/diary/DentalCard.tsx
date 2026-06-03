'use client'

import { useRef } from 'react'
import { CameraIcon, CardHeader, MultiSelectCardProps, Pill, PhotoStrip, usePhotoUpload } from './SkinHairCard'

const DENTAL_OPTIONS = [
  { key: 'tartar',  label: '牙結石',    icon: '🔲' },
  { key: 'gumRed',  label: '牙齦紅腫',  icon: '⊙' },
  { key: 'breath',  label: '口腔異味',  icon: '≈' },
  { key: 'broken',  label: '斷牙鬆動',  icon: '⚡' },
  { key: 'drool',   label: '異常流口水', icon: '💧' },
]

export default function DentalCard({ value, onChange, photos = [], onPhotosChange }: MultiSelectCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, handleFileChange, removePhoto } = usePhotoUpload(photos, onPhotosChange)

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key])
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <CardHeader
        title="牙齒口腔"
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

      <PhotoStrip photos={photos} onRemove={removePhoto} />
    </div>
  )
}
