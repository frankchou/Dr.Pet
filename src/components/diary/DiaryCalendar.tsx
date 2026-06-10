'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// ─── 月曆 helper ──────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0=Sunday … 6=Saturday（週日優先排列）
  return new Date(year, month, 1).getDay()
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getWeekDays(anchorDate: Date): Date[] {
  const start = new Date(anchorDate)
  start.setDate(anchorDate.getDate() - anchorDate.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

const ChevronLeft = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const ChevronRight = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface DiaryCalendarProps {
  petId: string
  selectedDate: string       // YYYY-MM-DD
  onDateSelect: (date: string) => void
  /** 有記錄的日期集合，由父層提供；若無資料則傳空 Set */
  recordedDates?: Set<string>
}

// ─── 月曆模式 ─────────────────────────────────────────────────────────────────

interface MonthViewProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  recordedDates: Set<string>
}

function MonthView({ selectedDate, onDateSelect, recordedDates }: MonthViewProps) {
  const today = new Date()
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  // 初始月份從選取日期決定
  const initFromSelected = () => {
    if (selectedDate) {
      const d = new Date(selectedDate)
      return { year: d.getFullYear(), month: d.getMonth() }
    }
    return { year: today.getFullYear(), month: today.getMonth() }
  }

  const [{ year, month }, setYearMonth] = useState(initFromSelected)

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay    = getFirstDayOfMonth(year, month)

  const prevMonth = () => {
    setYearMonth(({ year: y, month: m }) =>
      m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
    )
  }
  const nextMonth = () => {
    setYearMonth(({ year: y, month: m }) =>
      m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
    )
  }

  return (
    <div className="bg-white border-2 border-slate-900/5 rounded-[32px] p-5 shadow-sm relative overflow-hidden">
      {/* 裝飾背景圓 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FEF1E2] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* 月份導航 */}
      <div className="flex justify-between items-center mb-6 px-2 relative z-10">
        <button
          onClick={prevMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-black transition-colors"
          aria-label="上個月"
        >
          <ChevronLeft />
        </button>
        <h3 className="font-bold text-xl text-slate-900">{year}年 {month + 1}月</h3>
        <button
          onClick={nextMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-black transition-colors"
          aria-label="下個月"
        >
          <ChevronRight />
        </button>
      </div>

      {/* 星期列 */}
      <div className="grid grid-cols-7 gap-y-4 gap-x-2 relative z-10">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="text-center text-[11px] font-bold text-slate-400 mb-2">{d}</div>
        ))}

        {/* 補空格 */}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} className="h-12" />
        ))}

        {/* 日期格 */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const key = toDateKey(year, month, day)
          const isToday    = key === todayKey
          const isSelected = key === selectedDate
          const hasRec     = recordedDates.has(key)

          return (
            <div
              key={day}
              onClick={() => onDateSelect(key)}
              className="flex flex-col items-center justify-start h-12 relative cursor-pointer group"
            >
              <div className={cn(
                'w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all',
                isSelected
                  ? 'bg-[#C4714A] text-white shadow-md'
                  : isToday
                  ? 'bg-[#111111] text-white shadow-md'
                  : 'text-slate-700 group-hover:bg-slate-100',
              )}>
                {day}
              </div>
              {hasRec && (
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full mt-0.5',
                  isSelected ? 'bg-white' : 'bg-[#C4714A]',
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 週曆模式 ─────────────────────────────────────────────────────────────────

interface WeekViewProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  recordedDates: Set<string>
}

function WeekView({ selectedDate, onDateSelect, recordedDates }: WeekViewProps) {
  const today = new Date()
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  // anchor 決定顯示哪一週（以選取日期或今天為基準）
  const initAnchor = () => {
    if (selectedDate) return new Date(selectedDate + 'T00:00:00')
    return today
  }
  const [anchor, setAnchor] = useState(initAnchor)
  const days = getWeekDays(anchor)

  const prevWeek = () => {
    setAnchor(a => {
      const d = new Date(a)
      d.setDate(d.getDate() - 7)
      return d
    })
  }
  const nextWeek = () => {
    setAnchor(a => {
      const d = new Date(a)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className="bg-white border-2 border-slate-900/5 rounded-3xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4 px-1">
        <button
          onClick={prevWeek}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 transition-colors"
          aria-label="上一週"
        >
          <ChevronLeft />
        </button>
        <span className="text-sm font-bold text-slate-600">
          {days[0].getMonth() + 1}/{days[0].getDate()} – {days[6].getMonth() + 1}/{days[6].getDate()}
        </span>
        <button
          onClick={nextWeek}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 transition-colors"
          aria-label="下一週"
        >
          <ChevronRight />
        </button>
      </div>

      <div className="flex justify-between items-center">
        {days.map((d, i) => {
          const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
          const isToday    = key === todayKey
          const isSelected = key === selectedDate
          const hasRec     = recordedDates.has(key)

          return (
            <div
              key={i}
              onClick={() => onDateSelect(key)}
              className="flex flex-col items-center gap-2 cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-400">{weekLabels[i]}</span>
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                isSelected
                  ? 'bg-[#C4714A] text-white shadow-md'
                  : isToday
                  ? 'bg-[#111111] text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100',
              )}>
                {d.getDate()}
              </div>
              {hasRec ? (
                <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-[#C4714A]' : 'bg-[#C4714A]')} />
              ) : (
                <div className="w-1.5 h-1.5" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DiaryCalendar（月/週切換）────────────────────────────────────────────────

export default function DiaryCalendar({
  selectedDate,
  onDateSelect,
  recordedDates = new Set(),
}: DiaryCalendarProps) {
  const [mode, setMode] = useState<'month' | 'week'>('month')

  return (
    <div>
      {/* 切換按鈕 */}
      <div className="flex justify-end mb-3">
        <div className="flex bg-slate-100 p-1 rounded-full gap-0.5">
          <button
            onClick={() => setMode('month')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-bold transition-all',
              mode === 'month'
                ? 'bg-[#C4714A] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            月檢視
          </button>
          <button
            onClick={() => setMode('week')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-bold transition-all',
              mode === 'week'
                ? 'bg-[#C4714A] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            週檢視
          </button>
        </div>
      </div>

      {mode === 'month' ? (
        <MonthView
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          recordedDates={recordedDates}
        />
      ) : (
        <WeekView
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          recordedDates={recordedDates}
        />
      )}
    </div>
  )
}
