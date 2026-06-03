'use client'

// 每日例行清單：三個預設項目，多選（已完成項目 key 陣列）

interface Props {
  value: string[]
  onChange: (val: string[]) => void
}

function IconToothbrush() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <path d="M18 4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4h12z"/>
      <path d="M6 8v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  )
}

function IconFootprint() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <path d="M4 16s.5-2 4-2 5 2 8 2 4-2 4-2"/>
      <circle cx="8" cy="8" r="2"/>
      <circle cx="13" cy="6" r="2"/>
      <circle cx="18" cy="9" r="1.5"/>
    </svg>
  )
}

function IconScissors() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <circle cx="6" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/>
      <line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={12} height={12}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

const CHECKLIST_ITEMS = [
  { key: 'dental', label: '刷牙清潔', Icon: IconToothbrush },
  { key: 'walk', label: '日常散步', Icon: IconFootprint },
  { key: 'grooming', label: '梳毛護理', Icon: IconScissors },
] as const

export default function DailyChecklist({ value, onChange }: Props) {
  function toggle(key: string) {
    const next = value.includes(key)
      ? value.filter((k) => k !== key)
      : [...value, key]
    onChange(next)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#2C1810]">每日紀錄項目</h3>
        <button
          onClick={() => alert('設定功能即將推出')}
          className="text-sm text-[#8B7355] font-medium"
        >
          設定
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CHECKLIST_ITEMS.map(({ key, label, Icon }) => {
          const isDone = value.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors ${
                isDone
                  ? 'border-[#C4714A] bg-[#C4714A]/5'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {/* 右上角勾選狀態 */}
              <span
                className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${
                  isDone ? 'bg-[#C4714A]' : 'border border-slate-200 bg-white'
                }`}
              >
                {isDone && <IconCheck />}
              </span>

              {/* icon 圓底 */}
              <div className="w-10 h-10 rounded-full bg-[#C4714A] flex items-center justify-center">
                <Icon />
              </div>

              <span className="text-xs font-medium text-[#2C1810] text-center leading-tight">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
