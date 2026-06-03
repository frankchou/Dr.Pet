'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn, parseJson, productTypeLabel } from '@/lib/utils'

// ─── 新版日誌元件 ──────────────────────────────────────────────────────────────
import DiaryTopBar from '@/components/diary/DiaryTopBar'
import DiaryCalendar from '@/components/diary/DiaryCalendar'
import MedicationModal from '@/components/diary/MedicationModal'
import GroomingModal from '@/components/diary/GroomingModal'
import MeasurementModal from '@/components/diary/MeasurementModal'
import DailyChecklist from '@/components/diary/DailyChecklist'
import DietStatusCard from '@/components/diary/DietStatusCard'
import AppetiteCard from '@/components/diary/AppetiteCard'
import WaterCard from '@/components/diary/WaterCard'
import StoolCard from '@/components/diary/StoolCard'
import UrineCard from '@/components/diary/UrineCard'
import VitalityCard from '@/components/diary/VitalityCard'
import MoodCard from '@/components/diary/MoodCard'
import SkinHairCard from '@/components/diary/SkinHairCard'
import EyeEarCard from '@/components/diary/EyeEarCard'
import DentalCard from '@/components/diary/DentalCard'
import DigestionCard from '@/components/diary/DigestionCard'
import RespiratoryCard from '@/components/diary/RespiratoryCard'
import NeuroCard from '@/components/diary/NeuroCard'
import ReproductiveCard from '@/components/diary/ReproductiveCard'

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

interface UsageRecord {
  id: string
  petId: string
  date: string
  notes?: string | null
  product?: Product | null
}

interface PetInfo {
  sex: string
}

// DietStatusCard の DietValue 型
interface DietValue {
  tab: 'all' | 'reduced' | 'forbidden'
  mealStatuses: Record<string, string>
}

// DailyHealthLog の全欄位（對應 API 回傳）
interface DailyHealthLogData {
  appetite: string | null
  waterMl: number | null
  waterStatus: string | null
  stoolType: string | null
  stoolDetails: string
  urineStatus: string | null
  vitality: string | null
  mood: string
  skinHair: string
  skinHairPhotos: string
  eyeEar: string
  eyeEarPhotos: string
  dental: string
  dentalPhotos: string
  digestion: string
  digestionPhotos: string
  respiratory: string
  neuro: string
  reproductive: string
  dailyChecklist: string
  dietStatusTab: string | null
  mealStatuses: string
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

// ─── AI 隨記 ──────────────────────────────────────────────────────────────────

interface AiMemoProps { petId: string }

interface ParsedRecord {
  type: string
  label: string
  data: Record<string, unknown>
}

function AiMemo({ petId }: AiMemoProps) {
  const [text, setText]       = useState('')
  const [parsing, setParsing] = useState(false)
  const [records, setRecords] = useState<ParsedRecord[] | null>(null)
  const [summary, setSummary] = useState('')
  const [saving, setSaving]   = useState(false)
  const [doneSaved, setDone]  = useState<string[]>([])

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
    <div>
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

// ─── DailyHealthLog 預設值 ────────────────────────────────────────────────────

function defaultHealthLog(): DailyHealthLogData {
  return {
    appetite: null,
    waterMl: null,
    waterStatus: null,
    stoolType: null,
    stoolDetails: '[]',
    urineStatus: null,
    vitality: null,
    mood: '[]',
    skinHair: '[]',
    skinHairPhotos: '[]',
    eyeEar: '[]',
    eyeEarPhotos: '[]',
    dental: '[]',
    dentalPhotos: '[]',
    digestion: '[]',
    digestionPhotos: '[]',
    respiratory: '[]',
    neuro: '[]',
    reproductive: '[]',
    dailyChecklist: '[]',
    dietStatusTab: null,
    mealStatuses: '{}',
  }
}

// ─── 主頁面 ────────────────────────────────────────────────────────────────────

export default function DiaryPage() {
  const searchParams = useSearchParams()
  const today = new Date().toISOString().split('T')[0]

  // ─ 基礎 state ──────────────────────────────────────────────────────────────
  const [petId, setPetId]               = useState('')
  const [petSex, setPetSex]             = useState<string>('unknown')
  const [selectedDate, setSelectedDate] = useState(today)
  const [recordedDates, setRecordedDates] = useState<Set<string>>(new Set())
  const [hasPlan, setHasPlan]           = useState(false)
  const [planStart, setPlanStart]       = useState('')

  // ─ Modal 開關 ──────────────────────────────────────────────────────────────
  const [showMedModal, setShowMedModal]     = useState(false)
  const [showGroomModal, setShowGroomModal] = useState(false)
  const [showMeasModal, setShowMeasModal]   = useState(false)

  // ─ 每日健康紀錄 state（對應 DailyHealthLog 欄位）──────────────────────────
  const [healthLog, setHealthLog] = useState<DailyHealthLogData>(defaultHealthLog)

  // DietStatusCard 用的複合值（tab + mealStatuses）
  const dietValue: DietValue = {
    tab: (healthLog.dietStatusTab as DietValue['tab']) ?? 'all',
    mealStatuses: parseJson<Record<string, string>>(healthLog.mealStatuses, {}),
  }

  // ─ Debounce 儲存 ref ────────────────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ─── 取本月記錄打點 ────────────────────────────────────────────────────────
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

  // ─── 載入當日健康紀錄 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!petId) return
    fetch(`/api/daily-health-log?petId=${petId}&date=${selectedDate}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: DailyHealthLogData | null) => {
        setHealthLog(data ?? defaultHealthLog())
      })
      .catch(() => setHealthLog(defaultHealthLog()))
  }, [petId, selectedDate])

  // ─── Debounce 自動儲存（1000ms）────────────────────────────────────────────
  const scheduleSave = useCallback((patch: Partial<DailyHealthLogData>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!petId) return
      try {
        await fetch('/api/daily-health-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ petId, date: selectedDate, ...patch }),
        })
      } catch { /* 靜默 */ }
    }, 1000)
  }, [petId, selectedDate])

  // ─── 更新單一欄位並排程儲存 ───────────────────────────────────────────────
  function patchLog(patch: Partial<DailyHealthLogData>) {
    setHealthLog(prev => ({ ...prev, ...patch }))
    scheduleSave(patch)
  }

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

  const scrollToDiet = () => {
    dietRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ─── Modal 回呼：儲存後刷新日曆打點 ──────────────────────────────────────
  const handleModalSaved = () => {
    setRecordedDates(prev => new Set([...prev, selectedDate]))
  }

  return (
    <div className="px-6 md:px-8 min-h-full flex flex-col gap-6 pb-28 pt-4 animate-in fade-in slide-in-from-bottom-4">

      {/* ─── DiaryTopBar ──────────────────────────────────────────────── */}
      <DiaryTopBar
        onOpenMedication={() => setShowMedModal(true)}
        onOpenGrooming={() => setShowGroomModal(true)}
        onOpenMeasurement={() => setShowMeasModal(true)}
      />

      {/* ─── DiaryCalendar ────────────────────────────────────────────── */}
      <DiaryCalendar
        petId={petId}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        recordedDates={recordedDates}
      />

      {/* ─── 當日健康紀錄分隔標題 ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs font-bold text-slate-400 shrink-0">
          {selectedDate === today ? '今日' : selectedDate.slice(5).replace('-', '/')} 健康紀錄
        </span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* ─── DailyChecklist ───────────────────────────────────────────── */}
      <DailyChecklist
        value={parseJson<string[]>(healthLog.dailyChecklist, [])}
        onChange={(val) => patchLog({ dailyChecklist: JSON.stringify(val) })}
      />

      {/* ─── DietStatusCard ───────────────────────────────────────────── */}
      <DietStatusCard
        petId={petId}
        date={selectedDate}
        value={dietValue}
        onChange={(val) => patchLog({
          dietStatusTab: val.tab,
          mealStatuses: JSON.stringify(val.mealStatuses),
        })}
      />

      {/* ─── AppetiteCard ─────────────────────────────────────────────── */}
      <AppetiteCard
        value={healthLog.appetite}
        onChange={(val) => patchLog({ appetite: val })}
      />

      {/* ─── WaterCard ────────────────────────────────────────────────── */}
      <WaterCard
        value={
          healthLog.waterMl != null || healthLog.waterStatus != null
            ? JSON.stringify({ ml: healthLog.waterMl, status: healthLog.waterStatus })
            : null
        }
        onChange={(val) => {
          try {
            const parsed = JSON.parse(val) as { ml: number | null; status: string | null }
            patchLog({ waterMl: parsed.ml, waterStatus: parsed.status })
          } catch { /* 靜默 */ }
        }}
      />

      {/* ─── StoolCard ────────────────────────────────────────────────── */}
      <StoolCard
        value={
          healthLog.stoolType != null || healthLog.stoolDetails !== '[]'
            ? JSON.stringify({ stoolType: healthLog.stoolType, stoolDetails: parseJson<string[]>(healthLog.stoolDetails, []) })
            : null
        }
        onChange={(val) => {
          try {
            const parsed = JSON.parse(val) as { stoolType: string | null; stoolDetails: string[] }
            patchLog({
              stoolType: parsed.stoolType,
              stoolDetails: JSON.stringify(parsed.stoolDetails),
            })
          } catch { /* 靜默 */ }
        }}
      />

      {/* ─── UrineCard ────────────────────────────────────────────────── */}
      <UrineCard
        value={healthLog.urineStatus}
        onChange={(val) => patchLog({ urineStatus: val })}
        onSubmitDay={() => { /* 確認動畫由 UrineCard 內部處理 */ }}
      />

      {/* ─── VitalityCard ─────────────────────────────────────────────── */}
      <VitalityCard
        value={healthLog.vitality}
        onChange={(val) => patchLog({ vitality: val })}
      />

      {/* ─── MoodCard ─────────────────────────────────────────────────── */}
      <MoodCard
        value={parseJson<string[]>(healthLog.mood, [])}
        onChange={(val) => patchLog({ mood: JSON.stringify(val) })}
      />

      {/* ─── SkinHairCard ─────────────────────────────────────────────── */}
      <SkinHairCard
        value={parseJson<string[]>(healthLog.skinHair, [])}
        onChange={(val) => patchLog({ skinHair: JSON.stringify(val) })}
        photos={parseJson<string[]>(healthLog.skinHairPhotos, [])}
        onPhotosChange={(urls) => patchLog({ skinHairPhotos: JSON.stringify(urls) })}
      />

      {/* ─── EyeEarCard ───────────────────────────────────────────────── */}
      <EyeEarCard
        value={parseJson<string[]>(healthLog.eyeEar, [])}
        onChange={(val) => patchLog({ eyeEar: JSON.stringify(val) })}
        photos={parseJson<string[]>(healthLog.eyeEarPhotos, [])}
        onPhotosChange={(urls) => patchLog({ eyeEarPhotos: JSON.stringify(urls) })}
      />

      {/* ─── DentalCard ───────────────────────────────────────────────── */}
      <DentalCard
        value={parseJson<string[]>(healthLog.dental, [])}
        onChange={(val) => patchLog({ dental: JSON.stringify(val) })}
        photos={parseJson<string[]>(healthLog.dentalPhotos, [])}
        onPhotosChange={(urls) => patchLog({ dentalPhotos: JSON.stringify(urls) })}
      />

      {/* ─── DigestionCard ────────────────────────────────────────────── */}
      <DigestionCard
        value={parseJson<string[]>(healthLog.digestion, [])}
        onChange={(val) => patchLog({ digestion: JSON.stringify(val) })}
        photos={parseJson<string[]>(healthLog.digestionPhotos, [])}
        onPhotosChange={(urls) => patchLog({ digestionPhotos: JSON.stringify(urls) })}
      />

      {/* ─── RespiratoryCard ──────────────────────────────────────────── */}
      <RespiratoryCard
        value={parseJson<string[]>(healthLog.respiratory, [])}
        onChange={(val) => patchLog({ respiratory: JSON.stringify(val) })}
      />

      {/* ─── NeuroCard ────────────────────────────────────────────────── */}
      <NeuroCard
        value={parseJson<string[]>(healthLog.neuro, [])}
        onChange={(val) => patchLog({ neuro: JSON.stringify(val) })}
      />

      {/* ─── ReproductiveCard ─────────────────────────────────────────── */}
      <ReproductiveCard
        value={parseJson<string[]>(healthLog.reproductive, [])}
        onChange={(val) => patchLog({ reproductive: JSON.stringify(val) })}
        sex={petSex}
      />

      {/* ─── 分隔標題：保留功能 ───────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs font-bold text-slate-400 shrink-0">AI 隨記 / 飲食 / 換食計畫</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* ─── AiMemo ───────────────────────────────────────────────────── */}
      <AiMemo petId={petId} />

      {/* ─── DietRecord ───────────────────────────────────────────────── */}
      <DietRecord
        petId={petId}
        dietRef={dietRef}
        hasPlan={hasPlan}
        setHasPlan={handleSetHasPlan}
      />

      {/* ─── ProductLists ─────────────────────────────────────────────── */}
      <ProductLists petId={petId} onAddNewProduct={scrollToDiet} />

      {/* ─── 換食計畫進行中 ───────────────────────────────────────────── */}
      {hasPlan && planStart && (
        <DietPlanActive
          petId={petId}
          startDate={planStart}
          onEnd={() => handleSetHasPlan(false)}
        />
      )}

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
    </div>
  )
}
