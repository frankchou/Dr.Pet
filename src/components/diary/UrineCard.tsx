'use client'

import { useState } from 'react'

// 今日泌尿健康卡片 + 提交橫幅
// value 格式：string（單選 pill 值）

interface Props {
  value: string | null
  onChange: (val: string) => void
  onSubmitDay: () => void
}

function IconSmile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#7C9CE3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 13s1.5 3 4 3 4-3 4-3"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  )
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

const OPTIONS = [
  { value: '尿量正常', icon: '😊' },
  { value: '頻尿蹲', icon: '🔄' },
  { value: '極稀少', icon: '⚠' },
  { value: '血尿', icon: '🔔' },
] as const

export default function UrineCard({ value, onChange, onSubmitDay }: Props) {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    setSubmitted(true)
    onSubmitDay()
    // 1.5 秒後恢復按鈕文字
    setTimeout(() => setSubmitted(false), 1500)
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#2C1810]">今日泌尿</h3>
        <IconSmile />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
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

      {/* 提交橫幅 */}
      <button
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl text-[#C4714A] font-bold text-sm transition-colors hover:bg-[#C4714A]/5"
      >
        {submitted ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            已記錄
          </>
        ) : (
          <>
            <IconShield />
            今日健康狀態良好
          </>
        )}
      </button>
    </div>
  )
}
