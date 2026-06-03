'use client'

import { cn } from '@/lib/utils'
import { MultiSelectCardProps, Pill } from './SkinHairCard'

// 愛心 icon（粉紅色）
const HeartIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#F391B3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const FEMALE_OPTIONS = [
  { key: 'f_bleeding',  label: '私處滴血', icon: '💧' },
  { key: 'f_milky',     label: '乳頭脹奶', icon: '⊙' },
  { key: 'f_swollen',   label: '私處紅腫', icon: '⊙' },
  { key: 'f_licking',   label: '舔舐私處', icon: '🖐' },
  { key: 'f_nesting',   label: '吐物築巢', icon: '🏠' },
]

const MALE_OPTIONS = [
  { key: 'm_discharge', label: '生殖器分泌', icon: '💧' },
  { key: 'm_mounting',  label: '頻繁騎乘',   icon: '↗' },
  { key: 'm_spray',     label: '噴尿佔地',   icon: '≈' },
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
