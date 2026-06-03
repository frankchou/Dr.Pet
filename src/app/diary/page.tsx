'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn, parseJson, productTypeLabel } from '@/lib/utils'

// 解析 AI 提取的成分字串（可能帶 ```json 標記）
function parseIngredientText(raw: string | null | undefined): { ingredients: string[]; raw: string } | null {
  if (!raw) return null
  // 去掉 markdown code fence
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    const obj = JSON.parse(cleaned)
    const ingredients: string[] = Array.isArray(obj.ingredients) ? obj.ingredients : []
    return { ingredients, raw: obj.raw_text || cleaned }
  } catch {
    // 不是 JSON，直接當純文字
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

interface UsageRecord {
  id: string
  petId: string
  date: string
  notes?: string | null
  product?: Product | null
}

interface SymptomRecord {
  id: string
  petId: string
  symptomType: string
  severity: number
  notes?: string | null
  createdAt: string
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

const GROOMING_ITEMS: Array<{ key: string; label: string }> = [
  { key: 'all',         label: '全選' },
  { key: 'wash',        label: '洗澡' },
  { key: 'nails',       label: '剪甲' },
  { key: 'ears',        label: '清耳' },
  { key: 'glands',      label: '擠肛門腺' },
  { key: 'shaveBottom', label: '剃腳底毛' },
  { key: 'shaveAll',    label: '全身剪' },
]

// ─── 月曆 helper ─────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0=Sunday, 1=Monday, ..., 6=Saturday → 轉成週日優先格
  return new Date(year, month, 1).getDay()
}

// ─── SVG icon shims（不安裝額外套件，用 inline svg）────────────────────────

const ChevronLeft = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const ChevronRight = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
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

const Mic = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const CheckCircle2 = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const Check = ({ size = 12, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const Pill = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3.5" />
    <circle cx="17" cy="17" r="5" />
    <path d="m14.5 14.5 5 5" />
  </svg>
)

const Scissors = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
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

const Camera = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const Clock = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
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

const Spinner = ({ className = '' }: { className?: string }) => (
  <div className={cn('w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin', className)} />
)

// ─── Bounce loading dots ───────────────────────────────────────────────────

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

// ─── DayDetail：點選日期後的紀錄詳情面板 ──────────────────────────────────────

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
  const [data, setData]   = useState<DayRecord | null>(null)
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

      {!loading && isEmpty && (
        <p className="text-sm text-slate-400 text-center py-4">這天沒有任何紀錄</p>
      )}

      {!loading && data && (
        <div className="space-y-3">
          {/* 健康指標 */}
          {data.healthMetric && (
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-xs font-bold text-slate-500 mb-2">健康指標</p>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                {data.healthMetric.bodyScore && <span className="bg-white border border-slate-200 px-2 py-1 rounded-full">體態 {data.healthMetric.bodyScore}/9</span>}
                {data.healthMetric.vitality  && <span className="bg-white border border-slate-200 px-2 py-1 rounded-full">活力 { {low:'低落',medium:'正常',high:'活躍'}[data.healthMetric.vitality] ?? data.healthMetric.vitality}</span>}
                {data.healthMetric.waterIntake && <span className="bg-white border border-slate-200 px-2 py-1 rounded-full">水分 {{low:'偏少',medium:'正常',high:'偏多'}[data.healthMetric.waterIntake] ?? data.healthMetric.waterIntake}</span>}
              </div>
            </div>
          )}
          {/* 飲食紀錄 */}
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
          {/* 症狀/用藥/美容 */}
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
                      const vals = Object.values(n).flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean)
                      detail = vals.slice(0, 3).join('、')
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

// ─── Month calendar ────────────────────────────────────────────────────────

interface MonthCalendarProps {
  recordedDates: Set<string>
  petId: string
}

function MonthCalendar({ recordedDates, petId }: MonthCalendarProps) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay   = getFirstDayOfMonth(year, month)
  const todayKey   = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const prevMonth = () => {
    setSelectedDate(null)
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    setSelectedDate(null)
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const handleDayClick = (key: string) => {
    setSelectedDate(prev => prev === key ? null : key)
  }

  return (
    <div className="mb-4">
      <div className="bg-white border-2 border-slate-900/5 rounded-[32px] p-5 shadow-sm relative overflow-hidden mb-3">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FEF1E2] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex justify-between items-center mb-6 px-2 relative z-10">
          <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-black transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-bold text-xl text-slate-900">{year}年 {month + 1}月</h3>
          <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-black transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-4 gap-x-2 relative z-10">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div key={d} className="text-center text-[11px] font-bold text-slate-400 mb-2">{d}</div>
          ))}
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="h-12" />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday    = key === todayKey
            const hasRec     = recordedDates.has(key)
            const isSelected = key === selectedDate
            return (
              <div
                key={day}
                onClick={() => handleDayClick(key)}
                className="flex flex-col items-center justify-start h-12 relative cursor-pointer group"
              >
                <div className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all',
                  isSelected ? 'bg-[#D98A53] text-white shadow-md'
                    : isToday ? 'bg-[#111111] text-white shadow-md'
                    : 'text-slate-700 group-hover:bg-slate-100',
                )}>{day}</div>
                {hasRec && <div className={cn('w-1.5 h-1.5 rounded-full mt-0.5', isSelected ? 'bg-white' : 'bg-[#7C9CE3]')} />}
              </div>
            )
          })}
        </div>
      </div>
      {selectedDate && (
        <DayDetail petId={petId} date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  )
}

// ─── Week calendar ─────────────────────────────────────────────────────────

interface WeekCalendarProps {
  recordedDates: Set<string>
  petId: string
}

function WeekCalendar({ recordedDates, petId }: WeekCalendarProps) {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const days = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-3 bg-white border-2 border-slate-900/5 rounded-3xl p-4 shadow-sm relative overflow-hidden">
        {days.map((label, i) => {
          const d = new Date(startOfWeek)
          d.setDate(startOfWeek.getDate() + i)
          const isToday = d.toDateString() === today.toDateString()
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const hasRec = recordedDates.has(key)
          const isSelected = key === selectedDate
          return (
            <div key={i} onClick={() => setSelectedDate(prev => prev === key ? null : key)} className="flex flex-col items-center gap-2 relative z-10 cursor-pointer">
              <span className="text-xs font-bold text-slate-400">{label}</span>
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                isSelected ? 'bg-[#D98A53] text-white shadow-md'
                  : isToday ? 'bg-[#111111] text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100',
              )}>{d.getDate()}</div>
              {hasRec && <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-[#D98A53]' : 'bg-[#7C9CE3]')} />}
            </div>
          )
        })}
      </div>
      {selectedDate && (
        <DayDetail petId={petId} date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  )
}

// ─── AI 隨記 ───────────────────────────────────────────────────────────────

interface AiMemoProps { petId: string }

interface ParsedRecord {
  type: string
  label: string
  data: Record<string, unknown>
}

function AiMemo({ petId }: AiMemoProps) {
  const [text, setText]         = useState('')
  const [parsing, setParsing]   = useState(false)
  const [records, setRecords]   = useState<ParsedRecord[] | null>(null)
  const [summary, setSummary]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [doneSaved, setDone]    = useState<string[]>([])

  const analyze = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || !petId || parsing) return
    setParsing(true)
    setRecords(null)
    setSummary('')
    setDone([])
    try {
      const res = await fetch('/api/diary-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, text: trimmed }),
      })
      const data = await res.json() as { records: ParsedRecord[]; summary: string }
      setRecords(data.records ?? [])
      setSummary(data.summary ?? '')
    } catch { /* 靜默 */ }
    finally { setParsing(false) }
  }, [text, petId, parsing])

  const confirmSave = async () => {
    if (!records?.length || !petId) return
    setSaving(true)
    try {
      const res = await fetch('/api/diary-parse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, records }),
      })
      const data = await res.json() as { saved: string[] }
      setDone(data.saved ?? [])
      setRecords(null)
      setText('')
    } catch { /* 靜默 */ }
    finally { setSaving(false) }
  }

  const TYPE_ICON: Record<string, string> = {
    symptom: '🩺', medication: '💊', grooming: '✂️',
    health_metric: '📊', food_note: '🍽️',
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3">AI 隨記</h2>
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setRecords(null); setDone([]) }}
          placeholder="輸入今日生活、飲食、症狀…例如：今天幫布丁洗澡剪甲，吃了皇家腎臟飼料，精神還不錯"
          className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 pr-14 min-h-[120px] text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-400"
        />
        <button
          className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-500 hover:text-black hover:bg-slate-100 transition-colors"
          aria-label="語音輸入（尚未實作）" disabled
        >
          <Mic size={18} />
        </button>
      </div>

      {text.trim() && !records && !parsing && (
        <button
          onClick={analyze}
          className="mt-3 w-full py-3 bg-[#111111] text-white rounded-2xl text-sm font-bold hover:bg-black transition-colors"
        >
          ✨ AI 自動辨識並建立紀錄
        </button>
      )}

      {parsing && (
        <div className="mt-4 bg-[#111111] text-white p-4 rounded-2xl flex items-center gap-3">
          <BounceDots />
          <span className="text-sm font-medium">AI 分析中，提取關鍵記錄…</span>
        </div>
      )}

      {records && records.length === 0 && !parsing && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-500 text-center">
          沒有識別到可記錄的事項，請再補充描述
        </div>
      )}

      {records && records.length > 0 && (
        <div className="mt-4 bg-white border-2 border-slate-900/5 rounded-[24px] p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <p className="text-sm font-bold text-slate-900 mb-3">AI 識別到以下記錄，確認後儲存：</p>
          {summary && <p className="text-xs text-slate-500 mb-3">{summary}</p>}
          <div className="space-y-2 mb-4">
            {records.map((rec, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0">{TYPE_ICON[rec.type] ?? '📝'}</span>
                <span className="text-sm font-bold text-slate-800 flex-1">{rec.label}</span>
                <button
                  onClick={() => setRecords(prev => prev?.filter((_, j) => j !== i) ?? null)}
                  className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14}>
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmSave}
              disabled={saving}
              className="flex-1 py-3 bg-[#111111] text-white rounded-2xl text-sm font-bold disabled:opacity-40"
            >
              {saving ? '儲存中…' : '✓ 確認全部儲存'}
            </button>
            <button
              onClick={() => { setRecords(null); setSummary('') }}
              className="px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {doneSaved.length > 0 && (
        <div className="mt-4 bg-[#EAF5ED] border border-[#BBF7D0] rounded-2xl p-4 animate-in fade-in">
          <p className="text-sm font-bold text-green-800 mb-2">✅ 已成功儲存 {doneSaved.length} 筆記錄：</p>
          <div className="flex flex-wrap gap-1.5">
            {doneSaved.map((s, i) => (
              <span key={i} className="text-xs bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full font-medium">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 用藥與看診 ──────────────────────────────────────────────────────────────

type MedKey = 'vaccine' | 'deworming' | 'prescription' | 'clinic'
type MedFields = Record<MedKey, string[]>

interface MedicationCardProps {
  petId: string
  recentRecords: SymptomRecord[]
}

const EMPTY_FIELDS = (): MedFields => ({ vaccine: [''], deworming: [''], prescription: [''], clinic: [''] })

function MedicationCard({ petId, recentRecords }: MedicationCardProps) {
  const [fields, setFields] = useState<MedFields>(EMPTY_FIELDS())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const inputItems: Array<{ key: MedKey; label: string; placeholder: string }> = [
    { key: 'vaccine',      label: '預防針與疫苗', placeholder: '輸入/選擇疫苗名稱' },
    { key: 'deworming',    label: '點吃驅蟲用藥', placeholder: '輸入/選擇驅蟲藥品牌' },
    { key: 'prescription', label: '服用處方藥物', placeholder: '輸入處方藥名稱' },
    { key: 'clinic',       label: '醫院門診檢查', placeholder: '輸入看診醫院/項目' },
  ]

  // 新增一個輸入框
  const addRow = (key: MedKey) =>
    setFields(prev => ({ ...prev, [key]: [...prev[key], ''] }))

  // 修改某列的值
  const updateRow = (key: MedKey, idx: number, val: string) =>
    setFields(prev => {
      const next = [...prev[key]]
      next[idx] = val
      return { ...prev, [key]: next }
    })

  // 刪除某列（至少保留一個空框）
  const removeRow = (key: MedKey, idx: number) =>
    setFields(prev => {
      const next = prev[key].filter((_, i) => i !== idx)
      return { ...prev, [key]: next.length > 0 ? next : [''] }
    })

  const hasAnyValue = Object.values(fields).some(arr => arr.some(v => v.trim() !== ''))

  const handleSubmit = async () => {
    if (!hasAnyValue || !petId) return
    setSaving(true)
    // 只儲存有值的欄位
    const toSave: Record<string, string[]> = {}
    for (const [k, arr] of Object.entries(fields)) {
      const filled = arr.filter(v => v.trim() !== '')
      if (filled.length > 0) toSave[k] = filled
    }
    try {
      await fetch('/api/symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          symptomType: 'medication',
          severity: 0,
          notes: JSON.stringify(toSave),
        }),
      })
      setSaved(true)
      setFields(EMPTY_FIELDS())
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // 靜默降級
    } finally {
      setSaving(false)
    }
  }

  // 歷史標籤 — 最近 3 筆
  const historyTags = recentRecords.slice(0, 3).map((r) => {
    const n = parseJson<Record<string, string | string[]>>(r.notes ?? '{}', {})
    const first = Object.values(n).flatMap(v => Array.isArray(v) ? v : [v]).find(v => v?.trim())
    return first ? { label: first, record: r } : null
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  const applyHistoryTag = (record: SymptomRecord) => {
    const n = parseJson<Record<string, string | string[]>>(record.notes ?? '{}', {})
    const next = EMPTY_FIELDS()
    for (const key of Object.keys(next) as MedKey[]) {
      const v = n[key]
      if (!v) continue
      next[key] = Array.isArray(v) ? (v.length > 0 ? v : ['']) : [v]
    }
    setFields(next)
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-4">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
        <Pill size={20} className="text-[#D98A53]" />
        <h3 className="font-bold text-lg">用藥與看診</h3>
      </div>

      {historyTags.length > 0 && (
        <div className="mb-5">
          <p className="text-sm font-bold text-slate-500 mb-2">歷史標籤：</p>
          <div className="flex flex-wrap gap-2">
            {historyTags.map((t, i) => (
              <button key={i} onClick={() => applyHistoryTag(t.record)}
                className="bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-bold px-4 py-2 rounded-full border border-slate-200">
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 ml-2">*(點擊自動帶入紀錄那天)</p>
        </div>
      )}

      <div>
        <p className="text-sm font-bold text-slate-500 mb-3">新增紀錄：</p>
        <div className="space-y-4">
          {inputItems.map((it) => (
            <div key={it.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-slate-700">{it.label}</span>
                <button
                  onClick={() => addRow(it.key)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  title="新增一筆"
                >
                  <Plus size={14} className="text-slate-600" />
                </button>
              </div>
              <div className="space-y-2">
                {fields[it.key].map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-slate-200 transition-all">
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => updateRow(it.key, idx, e.target.value)}
                        placeholder={it.placeholder}
                        className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 font-medium"
                      />
                    </div>
                    {fields[it.key].length > 1 && (
                      <button
                        onClick={() => removeRow(it.key, idx)}
                        className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14} className="text-red-400">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4 flex-wrap">
        <span className="text-sm font-bold text-slate-500">附加功能：</span>
        <div className="flex gap-2">
          <button disabled className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 border border-slate-200 opacity-50 cursor-not-allowed">
            <Camera size={14} /> 拍藥袋/收據
          </button>
          <button disabled className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 border border-slate-200 opacity-50 cursor-not-allowed">
            <Clock size={14} /> 下次提醒設定
          </button>
        </div>
      </div>

      {hasAnyValue && (
        <div className="mt-4">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              'w-full py-3 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2',
              saving ? 'bg-slate-200 text-slate-500' : 'bg-[#111111] text-white hover:bg-black',
            )}
          >
            {saving ? <Spinner className="text-slate-400" /> : saved ? '已儲存' : '新增紀錄'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 洗澡美容 ────────────────────────────────────────────────────────────────

type WashState = { all: boolean; wash: boolean; nails: boolean; ears: boolean; glands: boolean; shaveBottom: boolean; shaveAll: boolean }

interface GroomingCardProps {
  petId: string
}

function GroomingCard({ petId }: GroomingCardProps) {
  const [mode, setMode]   = useState<'home' | 'shop' | 'full'>('home')
  const [wash, setWash]   = useState<WashState>({ all: false, wash: true, nails: false, ears: true, glands: false, shaveBottom: false, shaveAll: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  const toggleWash = (key: string) => {
    if (key === 'all') {
      const v = !wash.all
      setWash({ all: v, wash: v, nails: v, ears: v, glands: v, shaveBottom: v, shaveAll: v })
    } else {
      setWash(prev => ({ ...prev, [key]: !prev[key as keyof WashState], all: false }))
    }
  }

  const handleSubmit = async () => {
    if (!petId) return
    setSaving(true)
    setError('')
    try {
      const items = mode === 'home'
        ? GROOMING_ITEMS.filter(it => it.key !== 'all' && wash[it.key as keyof WashState]).map(it => it.label)
        : mode === 'full' ? ['大美容（送洗）']
        : ['基礎小美容(送洗)']
      const res = await fetch('/api/symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          symptomType: 'grooming',
          severity: 0,
          notes: JSON.stringify({ mode, items }),
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || '儲存失敗')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
        <Scissors size={20} className="text-[#F391B3]" />
        <h3 className="font-bold text-lg">洗澡美容</h3>
      </div>
      <div className="mb-4">
        <p className="text-sm font-bold text-slate-500 mb-3">模式選擇 (單選)：</p>
        <div className="flex gap-4">
          {([{ k: 'home', l: '居家自洗' }, { k: 'shop', l: '基礎小美容(送洗)' }, { k: 'full', l: '大美容（送洗）' }] as const).map((m) => (
            <button key={m.k} onClick={() => setMode(m.k)} className={cn('flex items-center gap-2 text-sm font-bold transition-colors', mode === m.k ? 'text-black' : 'text-slate-400')}>
              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors', mode === m.k ? 'bg-black border-black text-white' : 'border-slate-300')}>
                {mode === m.k && <Check size={12} />}
              </div>
              {m.l}
            </button>
          ))}
        </div>
      </div>
      {mode === 'home' && (

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-xs font-bold text-slate-500 mb-3">(展開多選)</p>
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            {GROOMING_ITEMS.map((it) => {
              const checked = wash[it.key as keyof WashState]
              return (
                <button key={it.key} onClick={() => toggleWash(it.key)} className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors', checked ? 'bg-black border-black text-white' : 'bg-white border-slate-300')}>
                    {checked && <Check size={12} />}
                  </div>
                  {it.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="mt-6">
        {error && <p className="text-xs font-bold text-red-500 mb-2 text-center">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className={cn(
            'w-full py-3 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2',
            saving ? 'bg-slate-200 text-slate-500' : 'bg-[#111111] text-white hover:bg-black',
          )}
        >
          {saving ? <Spinner className="text-slate-400" /> : saved ? '✓ 已儲存' : '新增美容紀錄'}
        </button>
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
      className="w-full text-left bg-[#111111] rounded-2xl p-5 mb-6 flex items-center justify-between gap-3 group hover:bg-black transition-colors shadow-lg shadow-black/10 relative overflow-hidden"
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
  const [recs, setRecs]         = useState<RecommendedProduct[]>([])
  const [loading, setLoading]   = useState(true)
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
          // API 回傳 { forProduct, alternatives: [{ productName, reason, keyFeatures, avoid, searchTip }] }
          // 攤平成 RecCard 預期的 { name, description, pros, avoid, tip } 格式
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
    <div className="mt-2 space-y-4">
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
            <button
              onClick={() => setRefreshCount(c => c + 1)}
              className="text-sm font-bold text-[#D98A53] hover:underline"
            >
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

// ─── AI 網路搜尋結果卡片 ─────────────────────────────────────────────────────

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
      // 先建立 Product，再加 Usage
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

// ─── 產品搜尋結果 Accordion ──────────────────────────────────────────────────

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

// ─── 日常飲食紀錄 ──────────────────────────────────────────────────────────────

interface DietRecordProps {
  petId: string
  dietRef: React.RefObject<HTMLDivElement | null>
  hasPlan: boolean
  setHasPlan: (v: boolean) => void
}

interface AiWebProduct {
  name: string; brand: string; type: string; description: string
  ingredients: string[]; is_from_web: boolean
  cautionCount: number; warningCount: number; toxicCount: number; safeCount: number
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

  // 本地 DB 搜尋（快速）
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

  // AI Google 搜尋（較慢，每次輸入後 800ms 觸發）
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
    } catch {
      // 靜默降級
    }
  }

  const addTrial = async (productId: string) => {
    if (!petId) return
    try {
      await fetch('/api/pet-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, productId, listType: 'trial' }),
      })
    } catch {
      // 靜默降級
    }
  }

  return (
    <div ref={dietRef} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-8 scroll-mt-24">
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
              {/* DB 結果 */}
              {searching ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner className="text-[#7C9CE3]" />
                </div>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} petId={petId} onAddUsage={addUsage} onAddTrial={addTrial} />
                ))
              ) : null}

              {/* AI Google 搜尋結果 */}
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

              {/* 完全沒結果 */}
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
  const [tab, setTab]     = useState<'fixed' | 'trial'>('fixed')
  const [items, setItems] = useState<PetProductEntry[]>([])
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
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-8">
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

// ─── 健康指標輸入 ──────────────────────────────────────────────────────────────

const VITALITY_OPTIONS = [
  { value: 'low',    label: '低落', emoji: '😴' },
  { value: 'medium', label: '正常', emoji: '😊' },
  { value: 'high',   label: '活躍', emoji: '⚡' },
]
const WATER_OPTIONS = [
  { value: 'low',    label: '偏少', emoji: '💧' },
  { value: 'medium', label: '正常', emoji: '🚿' },
  { value: 'high',   label: '偏多', emoji: '🌊' },
]

function HealthMetricInput({ petId }: { petId: string }) {
  const today = new Date().toISOString().split('T')[0]
  const [bodyScore, setBodyScore] = useState<number | null>(null)
  const [vitality, setVitality]   = useState<string | null>(null)
  const [waterIntake, setWater]   = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    if (!petId) return
    fetch(`/api/health-metrics?petId=${petId}&date=${today}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { bodyScore?: number | null; vitality?: string | null; waterIntake?: string | null } | null) => {
        if (d) {
          setBodyScore(d.bodyScore ?? null)
          setVitality(d.vitality ?? null)
          setWater(d.waterIntake ?? null)
        }
      })
      .catch(() => {})
  }, [petId, today])

  const save = async () => {
    if (!petId) return
    setSaving(true)
    try {
      await fetch('/api/health-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, date: today, bodyScore, vitality, waterIntake }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-2xl bg-[#EAF5ED] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-900">健康指標記錄</h3>
          <p className="text-xs text-slate-400 font-medium">今日 {today.slice(5).replace('-', '/')}</p>
        </div>
      </div>

      {/* 體態評分 BCS 1-9 */}
      <div className="mb-5">
        <p className="text-sm font-bold text-slate-700 mb-2">體態評分（BCS 1–9）</p>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => setBodyScore(bodyScore === n ? null : n)}
              className={cn(
                'w-9 h-9 rounded-full text-sm font-bold transition-all border-2',
                bodyScore === n
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
              )}>
              {n}
            </button>
          ))}
        </div>
        {/* BCS 對照表 */}
        <div className="bg-slate-50 rounded-2xl p-3 text-[11px] font-medium text-slate-500 grid grid-cols-3 gap-y-1 gap-x-2">
          {[
            ['1', '極度消瘦'], ['2', '非常消瘦'], ['3', '消瘦'],
            ['4', '偏瘦'],     ['5', '理想 ✓'],  ['6', '微胖'],
            ['7', '偏胖'],     ['8', '肥胖'],     ['9', '嚴重肥胖'],
          ].map(([score, label]) => (
            <span key={score} className={cn(
              'flex items-center gap-1',
              bodyScore === Number(score) ? 'text-[#111111] font-bold' : ''
            )}>
              <span className="font-bold text-slate-700">{score}</span> {label}
            </span>
          ))}
        </div>
      </div>

      {/* 活力指數 */}
      <div className="mb-5">
        <p className="text-sm font-bold text-slate-700 mb-2">活力指數</p>
        <div className="flex gap-2">
          {VITALITY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setVitality(vitality === opt.value ? null : opt.value)}
              className={cn(
                'flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all border-2 flex flex-col items-center gap-0.5',
                vitality === opt.value
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
              )}>
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 水分攝取 */}
      <div className="mb-6">
        <p className="text-sm font-bold text-slate-700 mb-2">水分攝取</p>
        <div className="flex gap-2">
          {WATER_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setWater(waterIntake === opt.value ? null : opt.value)}
              className={cn(
                'flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all border-2 flex flex-col items-center gap-0.5',
                waterIntake === opt.value
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
              )}>
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving || (!bodyScore && !vitality && !waterIntake)}
        className="w-full py-3 rounded-2xl bg-[#111111] text-white font-bold text-sm disabled:opacity-30 transition-all"
      >
        {saving ? '儲存中…' : saved ? '✓ 已儲存' : '儲存今日健康記錄'}
      </button>
    </div>
  )
}

export default function DiaryPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [petId, setPetId]         = useState('')
  const [calTab, setCalTab]       = useState<'month' | 'week'>('month')
  const [hasPlan, setHasPlan]     = useState(false)
  const [planStart, setPlanStart] = useState('')
  const [recordedDates, setRecordedDates] = useState<Set<string>>(new Set())

  const [medRecords, setMedRecords] = useState<SymptomRecord[]>([])

  const dietRef = useRef<HTMLDivElement>(null)

  // 讀取 localStorage
  useEffect(() => {
    const stored = localStorage.getItem('drpet_currentPetId')
    if (stored) setPetId(stored)

    const plan = localStorage.getItem('drpet_hasPlan')
    const start = localStorage.getItem('drpet_planStart')
    if (plan === 'true' && start) {
      setHasPlan(true)
      setPlanStart(start)
    }
  }, [])

  // 換食計畫狀態同步到 localStorage
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

  // 取本月記錄打點
  useEffect(() => {
    if (!petId) return
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    fetch(`/api/usages?petId=${petId}&limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then((data: UsageRecord[]) => {
        const dates = new Set<string>(
          data
            .filter(u => u.date && u.date.startsWith(yearMonth))
            .map(u => u.date.slice(0, 10)),
        )
        setRecordedDates(dates)
      })
      .catch(() => {})
  }, [petId])

  // 取用藥歷史
  useEffect(() => {
    if (!petId) return
    fetch(`/api/symptoms?petId=${petId}&symptomType=medication&limit=3`)
      .then(r => r.ok ? r.json() : [])
      .then((data: SymptomRecord[]) => setMedRecords(Array.isArray(data) ? data : []))
      .catch(() => setMedRecords([]))
  }, [petId])

  // Deep link：若 URL 含 ?section=diet 則 scroll 到飲食區塊
  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'diet' && dietRef.current) {
      const t = setTimeout(() => {
        dietRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
      return () => clearTimeout(t)
    }
  }, [searchParams])

  const scrollToDiet = () => {
    dietRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          aria-label="返回"
        >
          <ChevronLeft size={20} className="text-black" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">日誌</h1>
        <div className="w-10 h-10" />
      </div>

      {/* 月曆 / 週曆 toggle */}
      <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
        <button onClick={() => setCalTab('month')} className={cn('flex-1 py-2 rounded-full text-sm font-bold transition-all', calTab === 'month' ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black')}>月曆頁面</button>
        <button onClick={() => setCalTab('week')}  className={cn('flex-1 py-2 rounded-full text-sm font-bold transition-all', calTab === 'week'  ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black')}>週曆頁面</button>
      </div>

      {calTab === 'week' ? (
        <WeekCalendar recordedDates={recordedDates} petId={petId} />
      ) : (
        <MonthCalendar recordedDates={recordedDates} petId={petId} />
      )}

      {/* AI 隨記 */}
      <AiMemo petId={petId} />

      {/* 快速紀錄 header */}
      <h2 className="text-lg font-bold mb-4">
        快速紀錄 <span className="text-sm text-slate-400 font-medium">(偶發事件，點擊由底部彈出)</span>
      </h2>

      <MedicationCard petId={petId} recentRecords={medRecords} />
      <GroomingCard petId={petId} />

      <HealthMetricInput petId={petId} />

      <DietRecord
        petId={petId}
        dietRef={dietRef}
        hasPlan={hasPlan}
        setHasPlan={handleSetHasPlan}
      />

      <ProductLists petId={petId} onAddNewProduct={scrollToDiet} />

      {hasPlan && planStart && (
        <DietPlanActive
          petId={petId}
          startDate={planStart}
          onEnd={() => handleSetHasPlan(false)}
        />
      )}
    </div>
  )
}
