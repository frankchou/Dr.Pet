'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { MultiSelectCardProps, Pill } from './SkinHairCard'

// 愛心 icon（粉紅色）
const HeartIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#F391B3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

// ─── 生殖與分泌 Pill 圖示 ─────────────────────────────────────────────────────

const I = (paths: React.ReactNode) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
)

// 水滴（通用：分泌/流血/流出）
const IcoDrop = () => I(<><path d="M12 3 C12 3 6 10 6 15 C6 18.3 8.7 21 12 21 C15.3 21 18 18.3 18 15 C18 10 12 3 12 3Z"/></>)
// 乳頭脹奶：水滴 + 內圈
const IcoMilky = () => I(<><path d="M12 3 C12 3 6 10 6 15 C6 18.3 8.7 21 12 21 C15.3 21 18 18.3 18 15 C18 10 12 3 12 3Z"/><circle cx="12" cy="15" r="3"/></>)
// 私處紅腫：發炎圓形 + 輻射線
const IcoSwollen = () => I(<><circle cx="12" cy="12" r="5"/><line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21" y2="12"/></>)
// 舔舐私處：舌頭彎曲形
const IcoLicking = () => I(<><path d="M8 6 C8 3 12 3 12 6 L12 16 C12 19 9 21 7 19 C5 17 6 14 8 14"/></>)
// 吐物築巢：小屋形狀
const IcoNesting = () => I(<><polyline points="3 9 12 3 21 9"/><rect x="5" y="9" width="14" height="12" rx="1"/><rect x="9" y="14" width="6" height="7"/></>)
// 頻繁騎乘：向上彎曲箭頭
const IcoMounting = () => I(<><path d="M12 20 L12 10 C12 6 16 4 19 6"/><polyline points="16 4 19 6 17 9"/></>)
// 噴尿佔地：弧線 + 水珠點
const IcoSpray = () => I(<><path d="M4 14 C7 10 11 8 12 10"/><circle cx="15" cy="6" r="1.5"/><circle cx="19" cy="9" r="1.5"/><circle cx="21" cy="14" r="1.5"/><circle cx="18" cy="4" r="1"/><circle cx="22" cy="6" r="1"/></>)

const FEMALE_OPTIONS = [
  { key: 'f_bleeding', label: '私處滴血', icon: <IcoDrop /> },
  { key: 'f_milky',    label: '乳頭脹奶', icon: <IcoMilky /> },
  { key: 'f_swollen',  label: '私處紅腫', icon: <IcoSwollen /> },
  { key: 'f_licking',  label: '舔舐私處', icon: <IcoLicking /> },
  { key: 'f_nesting',  label: '吐物築巢', icon: <IcoNesting /> },
]

const MALE_OPTIONS = [
  { key: 'm_discharge', label: '生殖器分泌', icon: <IcoDrop /> },
  { key: 'm_mounting',  label: '頻繁騎乘',   icon: <IcoMounting /> },
  { key: 'm_spray',     label: '噴尿佔地',   icon: <IcoSpray /> },
]

export interface ReproductiveCardProps extends MultiSelectCardProps {
  sex: 'female' | 'male' | string
}

export default function ReproductiveCard({ value, onChange, sex }: ReproductiveCardProps) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key])
  }

  const showFemale = sex !== 'male'
  const showMale   = sex !== 'female'

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base text-slate-900">生殖與分泌</h3>
        <div className="w-8 h-8 rounded-full bg-[#F391B3]/10 flex items-center justify-center">
          <HeartIcon />
        </div>
      </div>

      <div className="space-y-4">
        {showFemale && (
          <div>
            <p className={cn('text-xs font-bold mb-2', 'text-[#F391B3]')}>(母) FEMALE</p>
            <div className="flex flex-wrap gap-2">
              {FEMALE_OPTIONS.map(opt => (
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
        )}

        {showFemale && showMale && (
          <div className="border-t border-slate-100" />
        )}

        {showMale && (
          <div>
            <p className={cn('text-xs font-bold mb-2', 'text-blue-500')}>(公) MALE</p>
            <div className="flex flex-wrap gap-2">
              {MALE_OPTIONS.map(opt => (
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
        )}
      </div>
    </div>
  )
}
