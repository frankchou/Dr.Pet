'use client'

// 情緒行為健康卡片：多選 pill，值為 string[]

interface Props {
  value: string[]
  onChange: (val: string[]) => void
}

function IconWave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#7C9CE3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
      <path d="M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9 13.5 6 15 6s3 3 4.5 3S22 7.5 22 7.5"/>
      <path d="M2 17c1.5-3 3-4.5 4.5-4.5S9 14 10.5 14 13.5 11 15 11s3 3 4.5 3S22 12.5 22 12.5"/>
    </svg>
  )
}

// 平靜放鬆：笑臉
function IconSmile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 13s1.5 3 4 3 4-3 4-3"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  )
}

// 焦躁不安：閃電
function IconZap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

// 攻擊低吼：盾牌
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

// 異常嚎叫：喇叭音波
function IconVolume() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  )
}

interface MoodOption {
  value: string
  icon: React.ReactNode
}

const OPTIONS: MoodOption[] = [
  { value: '平靜放鬆', icon: <IconSmile /> },
  { value: '焦躁不安', icon: <IconZap /> },
  { value: '攻擊低吼', icon: <IconShield /> },
  { value: '異常嚎叫', icon: <IconVolume /> },
]

export default function MoodCard({ value, onChange }: Props) {
  function toggle(option: string) {
    const next = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option]
    onChange(next)
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#2C1810]">情緒行為</h3>
        <IconWave />
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const isSelected = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
                isSelected
                  ? 'bg-[#C4714A]/10 border border-[#C4714A] text-[#C4714A]'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {opt.icon} {opt.value}
            </button>
          )
        })}
      </div>
    </div>
  )
}
