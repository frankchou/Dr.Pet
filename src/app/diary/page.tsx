'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn, parseJson, productTypeLabel } from '@/lib/utils'
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


// ─── 解析 AI 提取的成分字串（可能帶 ```json 標記）──────────────────────────────
function parseIngredientText(raw: string | null | undefined): { ingredients: string[]; raw: string } | null {
  if (!raw) return null
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    const obj = JSON.parse(cleaned)
    const ingredients: string[] = Array.isArray(obj.ingredients) ? obj.ingredients : []
    return { ingredients, raw: obj.raw_text || cleaned }
  } catch {
    return { ingredients: [], raw: cleaned }
  }
}

// ─── 型別 ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  type: string
  name: string
  brand?: string | null
  variant?: string | null
  ingredientText?: string | null
}

interface PetProductEntry {
  id: string
  petId: string
  productId: string
  listType: string
  product: Product
}

interface PetInfo {
  sex: string
}


// ─── 常數 ────────────────────────────────────────────────────────────────────

const DANGER_WORDS = [
  '巧克力', '葡萄', '洋蔥', '大蒜', '咖啡因', '木糖醇', '酒精',
  'xylitol', 'chocolate', 'grape', 'onion', 'garlic',
]

const DIET_FILTERS = ['全部商品', '飼料', '保健品', '罐頭', '零食']

const TYPE_META: Record<string, { label: string; char: string; bg: string }> = {
  feed:       { label: '飼料',   char: '飼', bg: '#FEF1E2' },
  can:        { label: '罐頭',   char: '罐', bg: '#FDE2EC' },
  snack:      { label: '零食',   char: '零', bg: '#EDF3FB' },
  supplement: { label: '保健品', char: '保', bg: '#EAF5ED' },
  dental:     { label: '牙膏牙粉', char: '潔', bg: '#E2F3E4' },
}

const TYPE_FILTER_MAP: Record<string, string> = {
  '飼料': 'feed', '罐頭': 'can', '零食': 'snack', '保健品': 'supplement',
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

const ChevronUp = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
)

const ChevronDown = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const ChevronRight = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const Mic = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const Check = ({ size = 12, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const Plus = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const Search = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const AlertTriangle = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const FileText = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const CalendarIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const Sparkles = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z" />
    <path d="M5 15l.75 2.25L8 18l-2.25.75L5 21l-.75-2.25L2 18l2.25-.75z" />
  </svg>
)

const CheckCircle = ({ size = 12, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const ShoppingCart = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
)

const FlaskConical = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 2v8L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45L14 10V2" />
    <line x1="8.5" y1="2" x2="15.5" y2="2" />
  </svg>
)

const BarChart3 = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
  </svg>
)

const Factory = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
    <path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" />
  </svg>
)

const PackageIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

const BoxIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
)

const Spinner = ({ className = '' }: { className?: string }) => (
  <div className={cn('w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin', className)} />
)

// ─── Bounce loading dots ────────────────────────────────────────────────────

function BounceDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-white"
          style={{ animation: `bounce 1s ease-in-out ${i * 0.2}s infinite alternate` }}
        />
      ))}
      <style>{`@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-6px); } }`}</style>
    </div>
  )
}

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

// ─── 換食計畫橫幅 ─────────────────────────────────────────────────────────────

interface PlanBannerProps {
  hasPlan: boolean
  setHasPlan: (v: boolean) => void
}

function PlanBanner({ hasPlan, setHasPlan }: PlanBannerProps) {
  if (hasPlan) return null
  return (
    <button
      onClick={() => setHasPlan(true)}
      className="w-full text-left bg-[#111111] rounded-2xl p-5 mb-4 flex items-center justify-between gap-3 group hover:bg-black transition-colors shadow-lg shadow-black/10 relative overflow-hidden"
    >
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none">
        <Sparkles size={88} />
      </div>
      <div className="relative z-10 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-[#F391B3]" />
          <h3 className="text-white font-bold text-base">AI 換食計劃</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium leading-relaxed">目前的飲食計畫是最佳的嗎？讓 AI 根據毛孩現況為您客製化推薦</p>
      </div>
      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 relative z-10 group-hover:bg-white group-hover:text-black transition-all">
        <ChevronRight size={18} />
      </div>
    </button>
  )
}

// ─── 換食計畫進行中 ───────────────────────────────────────────────────────────

interface RecommendedProduct {
  name: string
  description: string
  pros: string[]
  avoid: string[]
  tip?: string
}

interface DietPlanActiveProps {
  petId: string
  startDate: string
  onEnd: () => void
}

function DietPlanActive({ petId, startDate, onEnd }: DietPlanActiveProps) {
  const [recs, setRecs]       = useState<RecommendedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [timestamp, setTimestamp] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)

  const dayCount = Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000) + 1)

  useEffect(() => {
    if (!petId) return
    setLoading(true)
    fetch(`/api/recommend?petId=${petId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'recommendations' in data) {
          type ApiRec = { forProduct: string; alternatives: { productName: string; reason: string; keyFeatures: string[]; avoid: string[]; searchTip?: string }[] }
          const raw = (data as { recommendations: ApiRec[] }).recommendations
          const flat: RecommendedProduct[] = raw.flatMap(r =>
            (r.alternatives ?? []).map(a => ({
              name: a.productName,
              description: `取代「${r.forProduct}」— ${a.reason}`,
              pros: a.keyFeatures ?? [],
              avoid: a.avoid ?? [],
              tip: a.searchTip,
            }))
          )
          setRecs(flat)
        }
        setTimestamp(new Date().toLocaleString('zh-TW'))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [petId, refreshCount])

  return (
    <div className="space-y-4">
      <div className="bg-[#E2F3E4] rounded-2xl p-4 border border-[#B7E4C7] shadow-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white shrink-0">
          <CalendarIcon size={16} />
        </div>
        <div className="flex-1">
          <h3 className="text-[#2D6A4F] font-bold text-sm">換食計畫進行中</h3>
          <p className="text-[#1B4332] font-bold">換食進度：第 {dayCount} 天</p>
        </div>
        <button onClick={onEnd} className="text-xs font-bold text-[#2D6A4F] border border-[#2D6A4F]/30 rounded-full px-3 py-1.5 hover:bg-[#2D6A4F]/10 transition-colors shrink-0">
          結束計劃
        </button>
      </div>

      <div className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart size={20} className="text-[#D98A53]" />
          <h3 className="font-bold text-lg">AI 產品替代推薦</h3>
        </div>
        <p className="text-sm font-medium text-slate-400 mb-4">根據風險成分與寵物健康狀況，推薦具體的替代產品</p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="text-[#D98A53]" />
          </div>
        ) : recs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">暫無推薦資料</p>
        ) : (
          <div className="space-y-3">
            {recs.map((rec, i) => (
              <RecCard key={i} {...rec} />
            ))}
          </div>
        )}
        {!loading && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
            <span className="text-[11px] font-bold text-slate-400">{timestamp}</span>
            <button onClick={() => setRefreshCount(c => c + 1)} className="text-sm font-bold text-[#D98A53] hover:underline">
              重新取得建議
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function RecCard({ name, description, pros, avoid, tip }: RecommendedProduct) {
  return (
    <div className="bg-[#FFFBF7] border border-[#F0E3D6] rounded-2xl p-4">
      <h4 className="font-bold text-[#D98A53] leading-snug mb-2">{name}</h4>
      <p className="text-xs font-medium text-slate-600 leading-relaxed mb-3">{description}</p>
      <div className="space-y-1.5">
        {pros.map((p, i) => (
          <p key={`pro-${i}`} className="text-xs font-medium text-[#16A34A] leading-relaxed flex gap-1.5">
            <span className="shrink-0">✓</span>{p}
          </p>
        ))}
        {(avoid ?? []).map((a, i) => (
          <p key={`avoid-${i}`} className="text-xs font-medium text-[#DC2626] leading-relaxed flex gap-1.5 bg-[#FEF2F2] rounded-lg px-2 py-1.5">
            <span className="shrink-0">✕ 避開</span>{a}
          </p>
        ))}
      </div>
      {tip && <p className="text-[11px] font-medium text-slate-400 leading-relaxed mt-2.5">💡 {tip}</p>}
    </div>
  )
}

// ─── AI 網路搜尋結果卡片 ──────────────────────────────────────────────────────

interface AiWebProduct {
  name: string; brand: string; type: string; description: string
  ingredients: string[]; is_from_web: boolean
  cautionCount: number; warningCount: number; toxicCount: number; safeCount: number
}

function AiProductCard({ product, petId, onAddUsage }: {
  product: AiWebProduct
  petId: string
  onAddUsage: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded]   = useState(false)
  const meta = TYPE_META[product.type] ?? { label: product.type, char: '他', bg: '#F0F0F0' }

  const handleAdd = async () => {
    if (!petId || adding) return
    setAdding(true)
    try {
      const pRes = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: product.type || 'other',
          name: product.name,
          brand: product.brand || '',
          ingredientJson: JSON.stringify({ ingredients: product.ingredients }),
        }),
      })
      if (!pRes.ok) throw new Error('建立產品失敗')
      const pData = await pRes.json() as { id: string }
      await onAddUsage(pData.id)
      setAdded(true)
    } catch { /* 靜默 */ }
    finally { setAdding(false) }
  }

  const riskBadge = product.toxicCount > 0
    ? <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">{product.toxicCount} 有毒</span>
    : product.warningCount > 0
    ? <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold">{product.warningCount} 警示</span>
    : product.cautionCount > 0
    ? <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">{product.cautionCount} 注意</span>
    : null

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${meta.bg}30`, color: '#555' }}>{meta.label}</span>
            {riskBadge}
            <span className="text-[10px] text-slate-400 font-medium">AI 搜尋</span>
          </div>
          <p className="font-bold text-slate-900 truncate">{product.name}</p>
          {product.brand && <p className="text-xs text-slate-400 font-medium">{product.brand}</p>}
          {product.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{product.description}</p>}
          {product.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.ingredients.slice(0, 6).map((ing, j) => (
                <span key={j} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">{ing}</span>
              ))}
              {product.ingredients.length > 6 && <span className="text-[10px] text-slate-400">+{product.ingredients.length - 6}</span>}
            </div>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || added}
          className="w-10 h-10 bg-[#111111] text-white rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform disabled:opacity-50"
        >
          {added ? <Check size={16} /> : adding ? <Spinner className="text-white" /> : <Plus size={20} />}
        </button>
      </div>
    </div>
  )
}

// ─── 產品搜尋結果 Accordion ────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product
  petId: string
  onAddUsage: (productId: string) => void
  onAddTrial: (productId: string) => void
}

function ProductCard({ product, petId, onAddUsage, onAddTrial }: ProductCardProps) {
  const [open, setOpen] = useState(false)
  const meta = TYPE_META[product.type] ?? { label: product.type, char: '他', bg: '#F0F0F0' }

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 relative mb-3">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex gap-2 mb-2">
            <span className="bg-[#E2F3E4] text-[#2D6A4F] px-2 py-0.5 rounded-full text-[10px] font-bold">{meta.label}</span>
          </div>
          <h3 className="font-bold text-lg mb-1 text-slate-900 leading-tight">{product.name}</h3>
          {product.brand && <p className="text-xs font-bold text-slate-400">{product.brand}{product.variant ? ` · ${product.variant}` : ''}</p>}
        </div>
        <button onClick={() => onAddUsage(product.id)} className="w-10 h-10 bg-[#111111] text-white rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform shadow-md" aria-label="新增飲食紀錄">
          <Plus size={20} />
        </button>
      </div>
      <div className="mt-2 border border-slate-200 rounded-xl bg-white overflow-hidden">
        <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-600" />
            <span className="text-sm font-bold text-slate-800">成分與營養資訊</span>
          </div>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        {open && (
          <div className="px-4 pb-4">
            {product.ingredientText ? (() => {
              const parsed = parseIngredientText(product.ingredientText)
              return (
                <>
                  {parsed && parsed.ingredients.length > 0 ? (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-slate-400 mb-2">識別成分</p>
                      <div className="flex flex-wrap gap-1.5">
                        {parsed.ingredients.map((ing, i) => (
                          <span key={i} className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">{ing}</span>
                        ))}
                      </div>
                    </div>
                  ) : parsed ? (
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">{parsed.raw}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['ISO 22000', 'AAFCO', 'FEDIAF'].map((c) => (
                      <span key={c} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md text-[10px] font-bold text-slate-700">
                        <CheckCircle size={12} /> {c}
                      </span>
                    ))}
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FlaskConical size={14} className="text-slate-600" />
                      <h4 className="font-bold text-slate-800 text-xs">營養添加物</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      詳細資料請參閱產品包裝說明
                    </p>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 size={14} className="text-slate-600" />
                      <h4 className="font-bold text-slate-800 text-xs">商品資訊</h4>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {product.brand && <p>品牌：{product.brand}</p>}
                      {product.variant && <p>規格：{product.variant}</p>}
                      <p>類型：{meta.label}</p>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Factory size={14} className="text-slate-600" />
                      <h4 className="font-bold text-slate-800 text-xs">製造與代理資訊</h4>
                    </div>
                    <p className="text-[10px] text-slate-400">詳細資訊請洽原廠</p>
                  </div>
                </>
              )
            })() : (
              <p className="text-xs text-slate-400 py-2">成分資訊暫無</p>
            )}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => onAddTrial(product.id)}
                className="w-full py-2 rounded-xl border border-dashed border-[#7C9CE3] text-[#7C9CE3] text-xs font-bold hover:bg-[#EDF3FB] transition-colors"
              >
                加入試用清單
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 日常飲食紀錄 ─────────────────────────────────────────────────────────────

interface DietRecordProps {
  petId: string
  dietRef: React.RefObject<HTMLDivElement | null>
  hasPlan: boolean
  setHasPlan: (v: boolean) => void
}

function DietRecord({ petId, dietRef, hasPlan, setHasPlan }: DietRecordProps) {
  const [meal, setMeal]             = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast')
  const [query, setQuery]           = useState('')
  const [filter, setFilter]         = useState('全部商品')
  const [products, setProducts]     = useState<Product[]>([])
  const [searching, setSearching]   = useState(false)
  const [aiProducts, setAiProducts] = useState<AiWebProduct[]>([])
  const [aiSearching, setAiSearch]  = useState(false)

  const isDanger = DANGER_WORDS.some(w => query.toLowerCase().includes(w.toLowerCase()))

  useEffect(() => {
    if (!query.trim()) { setProducts([]); setAiProducts([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json() as Product[]
          setProducts(Array.isArray(data) ? data : [])
        }
      } catch { /* 靜默 */ }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!query.trim() || query.length < 2 || isDanger) { setAiProducts([]); return }
    const timer = setTimeout(async () => {
      setAiSearch(true)
      setAiProducts([])
      try {
        const res = await fetch('/api/products/web-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, petId }),
        })
        if (res.ok) {
          const data = await res.json() as { products: AiWebProduct[] }
          setAiProducts(Array.isArray(data.products) ? data.products : [])
        }
      } catch { /* 靜默 */ }
      finally { setAiSearch(false) }
    }, 800)
    return () => clearTimeout(timer)
  }, [query, petId, isDanger])

  const filteredProducts = filter === '全部商品'
    ? products
    : products.filter(p => p.type === TYPE_FILTER_MAP[filter])

  const addUsage = async (productId: string) => {
    if (!petId) return
    try {
      await fetch('/api/usages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          productId,
          date: new Date().toISOString(),
          notes: JSON.stringify({ meal }),
        }),
      })
    } catch { /* 靜默 */ }
  }

  const addTrial = async (productId: string) => {
    if (!petId) return
    try {
      await fetch('/api/pet-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, productId, listType: 'trial' }),
      })
    } catch { /* 靜默 */ }
  }

  return (
    <div ref={dietRef} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm scroll-mt-24">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
        <PackageIcon size={20} className="text-[#7C9CE3]" />
        <h3 className="font-bold text-lg">日常飲食紀錄</h3>
      </div>

      <PlanBanner hasPlan={hasPlan} setHasPlan={setHasPlan} />

      {/* 餐次 tab */}
      <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
        {([{ k: 'breakfast', l: '早餐' }, { k: 'lunch', l: '中餐' }, { k: 'dinner', l: '晚餐' }] as const).map((m) => (
          <button
            key={m.k}
            onClick={() => setMeal(m.k)}
            className={cn(
              'flex-1 py-2 rounded-full text-sm font-bold transition-all',
              meal === m.k ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-black',
            )}
          >
            {m.l}
          </button>
        ))}
      </div>

      {/* 搜尋欄 */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋食物名稱..."
          className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all font-bold placeholder:text-slate-400"
        />
        <Mic size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>

      {/* 類型 filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {DIET_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
              filter === f ? 'bg-[#111111] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 搜尋結果 */}
      {query.trim() && (
        <>
          {isDanger ? (
            <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl p-4 flex gap-3 shadow-sm">
              <div className="mt-0.5"><AlertTriangle size={20} className="text-[#DC2626]" /></div>
              <div>
                <h3 className="text-[#991B1B] font-bold text-base mb-1">危險警告：{query}</h3>
                <p className="text-[#B91C1C] text-xs font-medium leading-relaxed">此食材對寵物具有潛在危害，若誤食可能導致嚴重後果，請立即諮詢獸醫！</p>
              </div>
            </div>
          ) : (
            <>
              {searching ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner className="text-[#7C9CE3]" />
                </div>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} petId={petId} onAddUsage={addUsage} onAddTrial={addTrial} />
                ))
              ) : null}

              {(aiSearching || aiProducts.length > 0) && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-slate-500">✨ AI 網路搜尋結果</span>
                    {aiSearching && <Spinner className="text-[#7C9CE3]" />}
                  </div>
                  {aiProducts.map((p, i) => (
                    <AiProductCard key={i} product={p} petId={petId} onAddUsage={addUsage} />
                  ))}
                </div>
              )}

              {!searching && !aiSearching && filteredProducts.length === 0 && aiProducts.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">找不到符合的產品，AI 搜尋中…</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── 使用中產品 ────────────────────────────────────────────────────────────────

interface ProductListsProps {
  petId: string
  onAddNewProduct: () => void
}

function ProductLists({ petId, onAddNewProduct }: ProductListsProps) {
  const [tab, setTab]         = useState<'fixed' | 'trial'>('fixed')
  const [items, setItems]     = useState<PetProductEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!petId) return
    setLoading(true)
    fetch(`/api/pet-products?petId=${petId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => setItems(Array.isArray(data) ? (data as PetProductEntry[]) : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [petId])

  const list = items.filter(p => p.listType === tab)

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
        <BoxIcon size={20} className="text-[#D98A53]" />
        <h3 className="font-bold text-lg">使用中產品</h3>
      </div>
      <div className="flex bg-slate-100 p-1.5 rounded-full mb-5">
        <button onClick={() => setTab('fixed')} className={cn('flex-1 py-2 rounded-full text-sm font-bold transition-all', tab === 'fixed' ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black')}>固定</button>
        <button onClick={() => setTab('trial')} className={cn('flex-1 py-2 rounded-full text-sm font-bold transition-all', tab === 'trial' ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black')}>試用</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="text-slate-300" />
        </div>
      ) : (
        <div className="space-y-3">
          {list.length === 0 ? (
            <div className="text-center py-8 text-sm font-bold text-slate-400">尚無{tab === 'fixed' ? '固定' : '試用'}產品</div>
          ) : list.map((p) => {
            const m = TYPE_META[p.product.type] ?? { label: productTypeLabel(p.product.type), char: '他', bg: '#F0F0F0' }
            return (
              <div key={p.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3 hover:bg-slate-100/70 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-[#D98A53] font-bold text-base" style={{ backgroundColor: m.bg }}>{m.char}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{p.product.name}</p>
                  <p className="text-[11px] font-bold text-slate-400">{m.label}{p.product.brand ? ` · ${p.product.brand}` : ''}</p>
                </div>
                <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0', tab === 'fixed' ? 'bg-[#FEF1E2] text-[#D98A53]' : 'bg-[#E2F3E4] text-[#2D6A4F]')}>
                  {tab === 'fixed' ? '固定' : '試用'}
                </span>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </div>
            )
          })}
          <button onClick={onAddNewProduct} className="w-full mt-1 flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-2xl py-3 text-sm font-bold text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
            <Plus size={16} /> 新增{tab === 'fixed' ? '固定' : '試用'}產品
          </button>
        </div>
      )}
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
  const [hasPlan, setHasPlan]           = useState(false)
  const [planStart, setPlanStart]       = useState('')

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

  // ─── 從 localStorage 讀取 petId / 換食計畫 ────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('drpet_currentPetId')
    if (stored) setPetId(stored)

    const plan  = localStorage.getItem('drpet_hasPlan')
    const start = localStorage.getItem('drpet_planStart')
    if (plan === 'true' && start) {
      setHasPlan(true)
      setPlanStart(start)
    }
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

  // ─── 換食計畫同步 localStorage ────────────────────────────────────────────
  const handleSetHasPlan = (v: boolean) => {
    setHasPlan(v)
    if (v) {
      const now = new Date().toISOString()
      setPlanStart(now)
      localStorage.setItem('drpet_hasPlan', 'true')
      localStorage.setItem('drpet_planStart', now)
    } else {
      localStorage.removeItem('drpet_hasPlan')
      localStorage.removeItem('drpet_planStart')
      setPlanStart('')
    }
  }

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

  const scrollToDiet = () => {
    dietRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

      {/* 日常飲食紀錄、使用中產品、換食計畫分隔線 — 暫時隱藏，功能移至飲食頁
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs font-bold text-slate-400 shrink-0">飲食 / 換食計畫</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <DietRecord petId={petId} dietRef={dietRef} hasPlan={hasPlan} setHasPlan={handleSetHasPlan} />
      <ProductLists petId={petId} onAddNewProduct={scrollToDiet} />
      {hasPlan && planStart && (
        <DietPlanActive petId={petId} startDate={planStart} onEnd={() => handleSetHasPlan(false)} />
      )}
      */}

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
