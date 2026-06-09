'use client'

// 每日例行清單：顯示「每日任務管理」中目前開啟的任務（開幾個顯示幾個），
// 完成勾選沿用 value（已完成 task.key 陣列）+ onChange，向下相容既有資料。

import type { DailyTask } from '@/hooks/useDailyTasks'

// icon 底色與 DailyTaskModal 保持一致（淺奶油底，搭配橘色 icon）
const ICON_BG: Record<DailyTask['icon'], string> = {
  dental: '#FEF1E2',
  walk: '#FDE8E8',
  grooming: '#FEF1E2',
  custom: '#EDF3FB',
}

interface Props {
  value: string[]
  onChange: (val: string[]) => void
  tasks: DailyTask[]
  onOpenSettings: () => void
}

function IconToothbrush() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <path d="M18 4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4h12z"/>
      <path d="M6 8v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  )
}

function IconFootprint() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <path d="M4 16s.5-2 4-2 5 2 8 2 4-2 4-2"/>
      <circle cx="8" cy="8" r="2"/>
      <circle cx="13" cy="6" r="2"/>
      <circle cx="18" cy="9" r="1.5"/>
    </svg>
  )
}

function IconScissors() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <circle cx="6" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/>
      <line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  )
}

function IconCustom() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}

function TaskIcon({ icon }: { icon: DailyTask['icon'] }) {
  if (icon === 'dental') return <IconToothbrush />
  if (icon === 'walk') return <IconFootprint />
  if (icon === 'grooming') return <IconScissors />
  return <IconCustom />
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={12} height={12}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export default function DailyChecklist({ value, onChange, tasks, onOpenSettings }: Props) {
  function toggle(key: string) {
    const next = value.includes(key)
      ? value.filter((k) => k !== key)
      : [...value, key]
    onChange(next)
  }

  // 只顯示目前開啟的任務（關閉的任務在此區塊隱藏）
  const enabledTasks = tasks.filter((t) => t.enabled)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#2C1810]">每日紀錄項目</h3>
        <button
          onClick={onOpenSettings}
          className="text-sm text-[#8B7355] font-medium hover:text-[#C4714A] transition-colors"
        >
          設定
        </button>
      </div>

      {enabledTasks.length === 0 ? (
        <button
          onClick={onOpenSettings}
          className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
        >
          目前沒有開啟的每日任務，點此設定
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {enabledTasks.map((task) => {
            const isDone = value.includes(task.key)
            return (
              <button
                key={task.key}
                onClick={() => toggle(task.key)}
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

                {/* icon 圓底：淺奶油底 + 橘色 icon，比照設計圖 diary-daily-record-block 與 DailyTaskModal */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[#D98A53]"
                  style={{ backgroundColor: ICON_BG[task.icon] }}
                >
                  <TaskIcon icon={task.icon} />
                </div>

                <span className="text-xs font-medium text-[#2C1810] text-center leading-tight">
                  {task.label}
                </span>
                {/* 備註細節（若有）顯示於項目下 */}
                {task.note && (
                  <span className="text-[10px] text-slate-400 text-center leading-tight line-clamp-1">
                    {task.note}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
