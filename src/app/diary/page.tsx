'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePollingRefresh } from '@/hooks/usePollingRefresh'

// ─── 新版日誌元件 ──────────────────────────────────────────────────────────────
import DiaryTopBar from '@/components/diary/DiaryTopBar'
// DiaryCalendar 已改回內建的 MonthCalendar / WeekCalendar
import MedicationModal from '@/components/diary/MedicationModal'
import GroomingModal from '@/components/diary/GroomingModal'
import MeasurementModal from '@/components/diary/MeasurementModal'
import HealthLogSection from '@/components/diary/HealthLogSection'
import MonthHealthOverview from '@/components/diary/MonthHealthOverview'
import DailyTaskModal from '@/components/diary/DailyTaskModal'
import NutritionistChat from '@/components/chat/NutritionistChat'
import { useRecordParams } from '@/hooks/useRecordParams'
import { useDailyTasks } from '@/hooks/useDailyTasks'

// ─── 月曆 helper ─────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

// 由 YYYY-MM-DD 字串取得「該日所在週的週日（本地時間）」
function startOfWeekFor(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - date.getDay())
  return date
}


// ─── 型別 ────────────────────────────────────────────────────────────────────

interface PetInfo {
  sex: string
}

// ─── SVG icon shims ───────────────────────────────────────────────────────────

const ChevronLeft = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const ChevronRight_Nav = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)


// ─── DayDetail ───────────────────────────────────────────────────────────────

interface DayRecord {
  symptoms: Array<{ id: string; symptomType: string; severity: number; notes: string | null; createdAt: string }>
  usages: Array<{ id: string; product: { name: string; brand: string | null; type: string }; date: string }>
  healthMetric: { bodyScore: number | null; vitality: string | null; waterIntake: string | null } | null
}

const SYMPTOM_TYPE_ZH: Record<string, string> = {
  medication: '用藥與看診', grooming: '洗澡美容',
  tear: '淚腺/淚痕', skin: '皮膚搔癢', digestive: '腸胃敏感',
  oral: '口臭牙結石', ear: '耳朵發炎', joint: '關節', other: '其他',
}

function DayDetail({ petId, date, onClose }: { petId: string; date: string; onClose: () => void }) {
  const [data, setData] = useState<DayRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 進入 / 切換日期時觸發非同步抓取，setLoading 為與外部 fetch 同步的載入旗標
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/diary-records?petId=${petId}&date=${date}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: DayRecord | null) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [petId, date])

  const [m, d] = date.slice(5).split('-')
  const isEmpty = data && data.symptoms.length === 0 && data.usages.length === 0 && !data.healthMetric

  return (
    <div className="mb-6 bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-slate-900">{m}/{d} 的紀錄</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      {loading && <div className="py-6 flex justify-center"><div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" /></div>}
      {!loading && isEmpty && <p className="text-sm text-slate-400 text-center py-4">這天沒有任何紀錄</p>}
      {!loading && data && (
        <div className="space-y-3">
          {data.healthMetric && (
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-xs font-bold text-slate-500 mb-2">健康指標</p>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                {data.healthMetric.bodyScore && <span className="bg-white border border-slate-200 px-2 py-1 rounded-full">體態 {data.healthMetric.bodyScore}/9</span>}
                {data.healthMetric.vitality && <span className="bg-white border border-slate-200 px-2 py-1 rounded-full">活力 { {low:'低落',medium:'正常',high:'活躍'}[data.healthMetric.vitality] ?? data.healthMetric.vitality}</span>}
                {data.healthMetric.waterIntake && <span className="bg-white border border-slate-200 px-2 py-1 rounded-full">水分 {{low:'偏少',medium:'正常',high:'偏多'}[data.healthMetric.waterIntake] ?? data.healthMetric.waterIntake}</span>}
              </div>
            </div>
          )}
          {data.usages.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-xs font-bold text-slate-500 mb-2">飲食紀錄（{data.usages.length} 筆）</p>
              <div className="flex flex-wrap gap-1.5">
                {data.usages.map(u => (
                  <span key={u.id} className="bg-white border border-slate-200 px-2 py-1 rounded-full text-xs font-medium text-slate-700">
                    {u.product.brand ? `${u.product.brand} ` : ''}{u.product.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.symptoms.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-xs font-bold text-slate-500 mb-2">其他紀錄（{data.symptoms.length} 筆）</p>
              <div className="space-y-1.5">
                {data.symptoms.map(s => {
                  const typeZh = SYMPTOM_TYPE_ZH[s.symptomType] ?? s.symptomType
                  let detail = ''
                  if (s.notes) {
                    try {
                      const n = JSON.parse(s.notes) as Record<string, unknown>
                      detail = Object.values(n).flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean).slice(0, 3).join('、')
                    } catch { detail = s.notes.slice(0, 40) }
                  }
                  return (
                    <div key={s.id} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-full shrink-0 font-bold">{typeZh}</span>
                      {detail && <span className="text-slate-500">{detail}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Month calendar ───────────────────────────────────────────────────────────

// 受控月曆：顯示月份（year/month）與選取日期(selectedDate)皆由父層持有，
// 與「已紀錄圓點」資料源（recordedDates）及下方總覽共用同一份狀態。
interface MonthCalendarProps {
  recordedDates: Set<string>
  petId: string
  year: number
  month: number
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onToggleView: () => void
}

function MonthCalendar({ recordedDates, petId, year, month, selectedDate, onSelectDate, onPrevMonth, onNextMonth, onToggleView }: MonthCalendarProps) {
  const today = new Date()

  function selectDate(key: string) {
    onSelectDate(selectedDate === key ? null : key)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const prevMonth = () => onPrevMonth()
  const nextMonth = () => onNextMonth()

  // 月曆整體縮約 ~0.85：cell 高度、字級、間距、留白同步縮小，較精緻但仍好點擊。
  return (
    <div className="mb-4">
      <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-4 shadow-sm relative overflow-hidden mb-3">
        <div className="absolute top-0 right-0 w-28 h-28 bg-[#FEF1E2] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        {/* 右上角檢視切換：月曆模式顯示「週檢視」 */}
        <button
          onClick={onToggleView}
          className="absolute top-3.5 right-3.5 z-20 px-3 py-1.5 rounded-full bg-[#FEF1E2] text-[#D98A53] text-xs font-bold hover:bg-[#FBE3CC] transition-colors"
        >
          週檢視
        </button>
        <div className="flex justify-start items-center gap-2 mb-5 pr-20 relative z-10">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-black transition-colors">
            <ChevronLeft size={17} />
          </button>
          <h3 className="font-bold text-lg text-slate-900">{year} / {month + 1}</h3>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-black transition-colors">
            <ChevronRight_Nav size={17} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-2.5 gap-x-1 relative z-10">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 mb-1">{d}</div>
          ))}
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="h-10" />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = key === todayKey
            const hasRec = recordedDates.has(key)
            const isSelected = key === selectedDate
            return (
              <div key={day} onClick={() => selectDate(key)} className="flex flex-col items-center justify-start h-10 relative cursor-pointer group">
                {/* 選取日 / 今日為圓角方形（squircle），比照設計圖 diary-calendar-toggle */}
                <div className={cn('w-9 h-9 flex items-center justify-center rounded-2xl text-[13px] font-bold transition-all',
                  isSelected ? 'bg-[#D98A53] text-white shadow-md' : isToday ? 'bg-[#111111] text-white shadow-md' : 'text-slate-700 group-hover:bg-slate-100'
                )}>{day}</div>
                {hasRec && <div className={cn('w-1.5 h-1.5 rounded-full mt-0.5', isSelected ? 'bg-white' : 'bg-[#7C9CE3]')} />}
              </div>
            )
          })}
        </div>
      </div>
      {selectedDate && <DayDetail petId={petId} date={selectedDate} onClose={() => onSelectDate(null)} />}
    </div>
  )
}

// ─── Week calendar ────────────────────────────────────────────────────────────

// 受控週曆：選取日期(selectedDate)由父層持有，與下方 HealthLogSection 連動；
// 顯示週由 weekStart（該週週日）決定，可上一週／下一週切換。
// 不再內建 DayDetail —— 當日紀錄改由頁面下方連動的 HealthLogSection 顯示，避免重複空區塊。
interface WeekCalendarProps {
  recordedDates: Set<string>
  weekStart: Date
  selectedDate: string
  onSelectDate: (date: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onToggleView: () => void
}

// 將週範圍格式化為「M/D – M/D」
function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setDate(weekStart.getDate() + 6)
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`
}

function WeekCalendar({ recordedDates, weekStart, selectedDate, onSelectDate, onPrevWeek, onNextWeek, onToggleView }: WeekCalendarProps) {
  const today = new Date()
  const days = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-3 px-2">
        <div className="flex items-center gap-2">
          <button onClick={onPrevWeek} className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-black transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="font-bold text-sm text-slate-900">{formatWeekRange(weekStart)}</span>
          <button onClick={onNextWeek} className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-black transition-colors">
            <ChevronRight_Nav size={18} />
          </button>
        </div>
        {/* 右上角檢視切換：週曆模式顯示「月檢視」 */}
        <button
          onClick={onToggleView}
          className="px-3 py-1.5 rounded-full bg-[#FEF1E2] text-[#D98A53] text-xs font-bold hover:bg-[#FBE3CC] transition-colors"
        >
          月檢視
        </button>
      </div>
      <div className="flex justify-between items-center bg-white border-2 border-slate-900/5 rounded-3xl p-4 shadow-sm relative overflow-hidden">
        {days.map((label, i) => {
          const d = new Date(weekStart)
          d.setDate(weekStart.getDate() + i)
          const isToday = d.toDateString() === today.toDateString()
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const hasRec = recordedDates.has(key)
          const isSelected = key === selectedDate
          return (
            <div key={i} onClick={() => onSelectDate(key)} className="flex flex-col items-center gap-2 relative z-10 cursor-pointer">
              <span className="text-xs font-bold text-slate-400">{label}</span>
              {/* 選取日 / 今日為圓角方形（squircle），與月曆一致 */}
              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all',
                isSelected ? 'bg-[#D98A53] text-white shadow-md' : isToday ? 'bg-[#111111] text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'
              )}>{d.getDate()}</div>
              {hasRec && <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-[#D98A53]' : 'bg-[#7C9CE3]')} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 主頁面 ────────────────────────────────────────────────────────────────────

export default function DiaryPage() {
  const searchParams = useSearchParams()
  const today = new Date().toISOString().split('T')[0]

  // ─ 基礎 state ──────────────────────────────────────────────────────────────
  const { params: recordParams, isEnabled } = useRecordParams()
  // 每日任務定義（清單 / 開關 / 備註），驅動「每日紀錄項目」區塊與管理 modal
  const { tasks: dailyTasks, saveTasks: saveDailyTasks } = useDailyTasks()

  const [petId, setPetId]               = useState('')
  const [petSex, setPetSex]             = useState<string>('unknown')
  const [selectedDate, setSelectedDate] = useState(today)
  const [recordedDates, setRecordedDates] = useState<Set<string>>(new Set())

  // ─ 月曆 / 週曆導覽 state ────────────────────────────────────────────────────
  const [calTab, setCalTab] = useState<'month' | 'week'>('month')
  const [monthSelectedDate, setMonthSelectedDate] = useState(today)

  // 月曆顯示的年月（受控）；以今日所在月份為初始
  const [calYear, setCalYear]   = useState(() => parseInt(today.slice(0, 4), 10))
  const [calMonth, setCalMonth] = useState(() => parseInt(today.slice(5, 7), 10) - 1)
  // 月曆內選取日期（null = 未選，不展開 DayDetail）
  const [monthDayDetail, setMonthDayDetail] = useState<string | null>(null)

  // 週曆顯示週的起始日（週日）；以今日所在週為初始
  const [weekStart, setWeekStart] = useState(() => startOfWeekFor(today))

  const [showMedModal, setShowMedModal]     = useState(false)
  const [showGroomModal, setShowGroomModal] = useState(false)
  const [showMeasModal, setShowMeasModal]   = useState(false)
  // 3-7 每日任務管理 modal / 3-5 AI 諮詢 bottom-sheet modal
  const [showTaskModal, setShowTaskModal]   = useState(false)
  const [showConsultModal, setShowConsultModal] = useState(false)

  // 頁面 ref 供 deep-link scroll
  const dietRef = useRef<HTMLDivElement>(null)

  // ─── 從 localStorage 讀取 petId ──────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('drpet_currentPetId')
    if (stored) setPetId(stored)
  }, [])

  // ─── 讀取寵物性別（供 ReproductiveCard）────────────────────────────────────
  useEffect(() => {
    if (!petId) return
    fetch(`/api/pets/${petId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: PetInfo | null) => {
        if (data?.sex) setPetSex(data.sex)
      })
      .catch(() => {})
  }, [petId])

  // ─── 取記錄打點（聚合所有紀錄來源，月曆與週曆共用同一份 recordedDates）─────
  // 月曆模式：取顯示月份；週曆模式：取顯示週可能跨到的月份（最多兩個）。
  const [datesRefreshKey, setDatesRefreshKey] = useState(0)
  const visibleYearMonths = (() => {
    if (calTab === 'month') {
      return [`${calYear}-${String(calMonth + 1).padStart(2, '0')}`]
    }
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const months = new Set<string>([
      `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}`,
      `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}`,
    ])
    return Array.from(months)
  })()
  const visibleYearMonthsKey = visibleYearMonths.join(',')

  useEffect(() => {
    if (!petId) return
    let cancelled = false
    Promise.all(
      visibleYearMonths.map(ym =>
        fetch(`/api/diary-dates?petId=${petId}&yearMonth=${ym}`)
          .then(r => (r.ok ? r.json() : { dates: [] }))
          .then((d: { dates: string[] }) => d.dates)
          .catch(() => [] as string[]),
      ),
    ).then(results => {
      if (cancelled) return
      setRecordedDates(new Set(results.flat()))
    })
    return () => { cancelled = true }
    // visibleYearMonthsKey 已涵蓋 calTab / calMonth / weekStart 的變化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId, visibleYearMonthsKey, datesRefreshKey])

  // ─── 共享資料即時同步 ─────────────────────────────────────────────────────
  // 共同飼主可能在另一端新增紀錄；定時 / 重新聚焦時重抓「月曆圓點」與「月總覽」
  // 等唯讀彙整資料。HealthLogSection 為使用者即時編輯的表單（debounce 自動存檔），
  // 若被輪詢覆寫會清掉未存的編輯，故刻意不納入輪詢。
  const refreshShared = useCallback(() => {
    if (petId) setDatesRefreshKey(k => k + 1)
  }, [petId])
  usePollingRefresh(refreshShared)

  // ─── Deep link：?section=diet ──────────────────────────────────────────────
  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'diet' && dietRef.current) {
      const t = setTimeout(() => {
        dietRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
      return () => clearTimeout(t)
    }
  }, [searchParams])

  // ─── Deep link：?view=week（切到週曆當日健康紀錄）/ ?open=medication（開用藥看診 modal）──
  // 由首頁「日查觀察表 / 就醫記錄表」入口導入；只在掛載時依初始 query 套用一次。
  const deepLinkAppliedRef = useRef(false)
  useEffect(() => {
    if (deepLinkAppliedRef.current) return
    const view = searchParams.get('view')
    const open = searchParams.get('open')
    if (view !== 'week' && open !== 'medication') return
    deepLinkAppliedRef.current = true
    if (view === 'week' || open === 'medication') {
      // 兩種入口都進入週曆當日健康紀錄
      switchToWeekView()
    }
    if (open === 'medication') {
      setShowMedModal(true)
    }
    // switchToWeekView 為穩定的頁面方法；此 effect 僅依初始 query 執行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ─── Modal 回呼：儲存後重新聚合日曆打點（涵蓋所有紀錄來源）──────────────
  const handleModalSaved = () => {
    setRecordedDates(prev => new Set([...prev, selectedDate]))
    setDatesRefreshKey(k => k + 1)
  }

  // ─── 月曆換月（收合 DayDetail，並讓下方總覽跟著切到新月份）──────────────
  const goToMonth = (year: number, month: number) => {
    setCalYear(year)
    setCalMonth(month)
    setMonthDayDetail(null)
    // 總覽的月份由 monthSelectedDate 推導，換月時對齊到新月份第一天
    setMonthSelectedDate(`${year}-${String(month + 1).padStart(2, '0')}-01`)
  }
  const goPrevMonth = () => {
    if (calMonth === 0) goToMonth(calYear - 1, 11)
    else goToMonth(calYear, calMonth - 1)
  }
  const goNextMonth = () => {
    if (calMonth === 11) goToMonth(calYear + 1, 0)
    else goToMonth(calYear, calMonth + 1)
  }

  // ─── 週曆換週（上拋的 selectedDate 維持不變，僅切換顯示週）──────────────
  const goPrevWeek = () => {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })
  }
  const goNextWeek = () => {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })
  }

  // ─── 月/週檢視切換（由月曆右上角按鈕觸發，行為與原本頂部 tab 相同）────────
  const switchToMonthView = () => {
    setCalTab('month')
    setMonthSelectedDate(today)
    setMonthDayDetail(null)
  }
  const switchToWeekView = () => {
    setCalTab('week')
    setSelectedDate(today)
    setWeekStart(startOfWeekFor(today))
  }

  return (
    <div className="px-6 md:px-8 min-h-full flex flex-col gap-6 pb-28 pt-4 animate-in fade-in slide-in-from-bottom-4">

      {/* 月/週切換已移到月曆右上角（3-8）；原本最頂部的 tab 已隱藏 */}
      {calTab === 'month' ? (
        <>
          {/* ─── 月曆模式：月曆 + 唯讀總覽 ─────────────────────────────── */}
          <MonthCalendar
            recordedDates={recordedDates}
            petId={petId}
            year={calYear}
            month={calMonth}
            selectedDate={monthDayDetail}
            onSelectDate={(d) => { setMonthDayDetail(d); setMonthSelectedDate(d ?? today) }}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            onToggleView={switchToWeekView}
          />
          <MonthHealthOverview
            petId={petId}
            date={monthSelectedDate}
            recordedCount={recordedDates.size}
            refreshKey={datesRefreshKey}
          />
        </>
      ) : (
        <>
          {/* ─── 週曆模式：週曆 + 記錄快捷 + 健康紀錄編輯區 ─────────── */}
          {/* 週曆選取的日期直接同步 selectedDate，驅動下方 HealthLogSection；不再內建重複的 DayDetail */}
          <WeekCalendar
            recordedDates={recordedDates}
            weekStart={weekStart}
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d)}
            onPrevWeek={goPrevWeek}
            onNextWeek={goNextWeek}
            onToggleView={switchToMonthView}
          />
          <DiaryTopBar
            onOpenMedication={() => setShowMedModal(true)}
            onOpenGrooming={() => setShowGroomModal(true)}
            onOpenMeasurement={() => setShowMeasModal(true)}
            showMedication={isEnabled('medication')}
            showGrooming={isEnabled('grooming')}
            showMeasurement={isEnabled('measurement')}
          />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-400 shrink-0">
              {selectedDate === today ? '今日' : selectedDate.slice(5).replace('-', '/')} 健康紀錄
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <HealthLogSection
            petId={petId}
            date={selectedDate}
            petSex={petSex}
            params={recordParams}
            dailyTasks={dailyTasks}
            onOpenTaskSettings={() => setShowTaskModal(true)}
          />
        </>
      )}

      {/* ─── 3-5 AI 諮詢浮動入口（fixed，捲動時固定；上移避開 BottomNav / 相機 FAB）─── */}
      <button
        onClick={() => setShowConsultModal(true)}
        aria-label="AI 諮詢"
        className="fixed z-40 right-5 md:right-8 bottom-24 md:bottom-8 w-14 h-14 rounded-full bg-[#111111] text-white flex items-center justify-center shadow-lg shadow-black/20 hover:bg-black active:scale-95 transition-all"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>

      {/* ─── Modals ───────────────────────────────────────────────────── */}
      {showMedModal && (
        <MedicationModal
          petId={petId}
          date={selectedDate}
          onClose={() => setShowMedModal(false)}
          onSaved={handleModalSaved}
        />
      )}

      {showGroomModal && (
        <GroomingModal
          petId={petId}
          date={selectedDate}
          onClose={() => setShowGroomModal(false)}
          onSaved={handleModalSaved}
        />
      )}

      {showMeasModal && (
        <MeasurementModal
          petId={petId}
          date={selectedDate}
          onClose={() => setShowMeasModal(false)}
          onSaved={handleModalSaved}
        />
      )}

      {/* 3-7 每日任務管理 bottom-sheet modal */}
      {showTaskModal && (
        <DailyTaskModal
          tasks={dailyTasks}
          onClose={() => setShowTaskModal(false)}
          onSave={saveDailyTasks}
        />
      )}

      {/* 3-5 AI 諮詢 bottom-sheet modal（重用 NutritionistChat / 接同一支 /api/chat）*/}
      {showConsultModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConsultModal(false) }}
        >
          <div className="bg-white rounded-t-3xl h-[88dvh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E2F3E4] flex items-center justify-center text-[#2D6A4F] shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                    <circle cx="20" cy="10" r="2" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-[#2C1810]">AI 諮詢</h2>
                  <p className="text-xs text-slate-500 font-medium">與 AI 討論毛孩的健康問題</p>
                </div>
              </div>
              <button
                onClick={() => setShowConsultModal(false)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors shrink-0"
                aria-label="關閉"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={18} height={18}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* header 已由 modal 提供，內部標題隱藏；輸入列貼齊 modal 底部 */}
            <div className="flex-1 min-h-0">
              <NutritionistChat showHeader={false} inputPaddingClassName="pb-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
