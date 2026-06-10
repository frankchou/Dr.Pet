'use client'

import { useState, useEffect } from 'react'
import { productTypeLabel } from '@/lib/utils'

const CATEGORY_ZH: Record<string, string> = {
  protein: '蛋白質', fat: '油脂', carb: '碳水', fiber: '纖維',
  vitamin: '維生素', mineral: '礦物質', probiotic: '益生菌',
  preservative: '防腐劑', functional: '功能性', toxic: '有毒',
  other: '其他',
}
function catLabel(cat: string) { return CATEGORY_ZH[cat] ?? cat }
import type { MatchedIngredient, SupplementRecommendation } from '@/lib/ingredientAnalyzer'

// ─── API 回應型別 ─────────────────────────────────────────────────────────────

interface AnalyzedProduct {
  id: string
  name: string
  brand: string | null
  type: string
  ingredientCount: number
}

interface NutritionalFact {
  name: string
  value: number
  unit: string
}

interface ProductNutrition {
  productId: string
  productName: string
  facts: NutritionalFact[]
}

interface AnalysisStats {
  totalIngredients: number
  toxicCount: number
  warningCount: number
  cautionCount: number
  safeCount: number
}

interface AnalysisResult {
  matched: MatchedIngredient[]
  toxicItems: MatchedIngredient[]
  warningItems: MatchedIngredient[]
  cautionItems: MatchedIngredient[]
  safeItems: MatchedIngredient[]
  supplements: SupplementRecommendation[]
  analyzedProducts: AnalyzedProduct[]
  stats: AnalysisStats
}

interface AnalysisData {
  pet: { id: string; name: string; species: string; weight: number | null; avatar: string | null }
  result: AnalysisResult
  nutritionByProduct: ProductNutrition[]
  analyzedAt: string
}

interface NutritionAiItem {
  nutrient: string
  status: 'safe' | 'caution' | 'warning' | 'danger'
  summary?: string
  assessment: string
  riskDetails: string
  recommendation: string
}

interface NutritionAiResult {
  overall: string
  items: NutritionAiItem[]
  generalRecommendations: string[]
  savedAt?: string
}

// ─── 參考來源常數 ─────────────────────────────────────────────────────────────

const A_REFS = '世界動物衛生組織、世界獸醫協會、WSAVA、CAPC、OFA、APOP、NRC、AAFCO（美國飼料管理協會）、FEDIAF、PNA、AAVN、Waltham Petcare Science Institute、農業部動植物防疫檢疫署、農業部食品藥物管理署、農業部、中華民國獸醫師公會全國聯合會、台灣小動物獸醫學會、台灣獸醫內科醫學會、台灣獸醫外科醫學會、國立臺灣大學獸醫專業學院、國立中興大學獸醫學系'

// ─── 營養素門檻（與 /analysis 完整規則一致）─────────────────────────────────
// 每 100g 乾物質的建議範圍（%）。min: AAFCO 最低需求（低於=不足）；warn: 超過此值=偏高。
// 犬貓各自一組門檻；缺 min 表示無下限參考、缺 warn 表示無上限參考。
type SpeciesThreshold = { min?: number; warn?: number }
const NUTRIENT_THRESHOLDS: Record<string, { dog?: SpeciesThreshold; cat?: SpeciesThreshold }> = {
  '粗蛋白': { dog: { min: 18, warn: 40 }, cat: { min: 26, warn: 55 } },
  '粗脂肪': { dog: { min: 5.5, warn: 25 }, cat: { min: 9, warn: 35 } },
  '粗纖維': { dog: { warn: 8 }, cat: { warn: 8 } },
  '水分':   { dog: { warn: 78 }, cat: { warn: 78 } },
  '鈉':     { dog: { min: 0.08, warn: 0.5 }, cat: { min: 0.2, warn: 0.8 } },
  '鈣':     { dog: { min: 0.5, warn: 2.5 }, cat: { min: 0.3, warn: 2.0 } },
  '磷':     { dog: { min: 0.4, warn: 1.6 }, cat: { min: 0.5, warn: 2.0 } },
}

// 中文 species → dog/cat（犬/狗→dog、貓→cat，無法判斷時預設 dog）
function resolveSpecies(species: string | undefined): 'dog' | 'cat' {
  if (species && species.includes('貓')) return 'cat'
  return 'dog'
}

// 用 min/warn 組出可讀的建議範圍字串（如「≥18% <40%」）
function formatRange(t: SpeciesThreshold | undefined): string {
  if (!t) return '—'
  const parts: string[] = []
  if (t.min != null) parts.push(`≥${t.min}%`)
  if (t.warn != null) parts.push(`<${t.warn}%`)
  return parts.length > 0 ? parts.join(' ') : '—'
}

// ─── Inline SVG 圖示（lucide 風格）──────────────────────────────────────────

function IconClipboardList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="15" y2="16"/>
      <line x1="9" y1="8" x2="11" y2="8"/>
    </svg>
  )
}

function IconChevronUp({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}

function IconChevronDown({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function IconCheck({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconZap({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

function IconInfo({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

function IconRefreshCw({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}

function IconOctagonAlert({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

function IconPencil({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IconBarChart({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

// ─── 小元件 ──────────────────────────────────────────────────────────────────

type BadgeKind = 'caution' | 'safe' | 'warn' | 'note' | 'low'

function ABadge({ kind, children }: { kind: BadgeKind; children: React.ReactNode }) {
  const colorMap: Record<BadgeKind, string> = {
    caution: 'bg-[#FACC15] text-white',
    safe: 'bg-[#DCFCE7] text-[#16A34A]',
    warn: 'bg-[#FFEDD5] text-[#C2410C]',
    note: 'bg-[#FEF9C3] text-[#854D0E]',
    low: 'bg-[#DBEAFE] text-[#1D4ED8]',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${colorMap[kind]}`}>
      {children}
    </span>
  )
}

function ACollapse({
  title,
  count,
  color,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode
  count: number
  color: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-2">
        <span className="font-bold text-base flex items-center gap-1.5" style={{ color }}>
          {title} <span className="font-bold">({count})</span>
        </span>
        {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  )
}

function AHowTo() {
  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-2xl p-4">
        <p className="font-bold text-slate-800 mb-2 text-sm">如何獲得更完整的分析？</p>
        <ul className="text-xs font-medium text-slate-500 leading-relaxed space-y-1">
          <li>· 在「日誌」中記錄所有正在使用的食品/用品</li>
          <li>· 用「照相」功能拍攝成分表，讓 AI 自動萃取成分</li>
          <li>· 在「日誌」頁記錄症狀，獲得針對性補充建議</li>
        </ul>
      </div>

      <div className="bg-[#FEF9F4] border border-[#F0E3D6] rounded-2xl p-4">
        <p className="text-[11px] font-bold text-[#9A6233] leading-relaxed flex gap-1.5">
          <span className="shrink-0 mt-0.5"><IconInfo size={14} /></span>
          <span>
            本系統之成分與營養分析由 AI 自動生成，<span className="font-bold">不具任何醫療診斷效力</span>，所有內容僅供參考，無法取代專業獸醫師之診斷與處置。實際餵食與用藥請務必諮詢您的獸醫師。
          </span>
        </p>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4">
        <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
          <span className="font-bold text-slate-500">資料參考來源：</span>{A_REFS}
        </p>
      </div>
    </div>
  )
}

// ─── 主元件 ──────────────────────────────────────────────────────────────────

// ─── NutrientCard：AI 每個營養素的可展開卡片 ─────────────────────────────────

const AI_STATUS_CFG = {
  safe:    { label: '安全', badge: 'bg-green-100 text-green-700',   icon: '✅', border: 'border-green-200',  bg: 'bg-green-50' },
  caution: { label: '留意', badge: 'bg-yellow-100 text-yellow-700', icon: '⚡', border: 'border-yellow-200', bg: 'bg-yellow-50' },
  warning: { label: '警示', badge: 'bg-orange-100 text-orange-700', icon: '⛔', border: 'border-orange-200', bg: 'bg-orange-50' },
  danger:  { label: '危險', badge: 'bg-red-100 text-red-700',       icon: '🚨', border: 'border-red-200',    bg: 'bg-red-50' },
} as const

function NutrientCard({ item }: { item: NutritionAiItem }) {
  const [open, setOpen] = useState(false)
  const cfg = AI_STATUS_CFG[item.status] ?? AI_STATUS_CFG.safe
  const isRisk = item.status === 'warning' || item.status === 'danger'
  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base leading-none">{cfg.icon}</span>
          <p className="font-bold text-sm text-slate-900 flex-1">{item.nutrient}</p>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${cfg.badge}`}>{cfg.label}</span>
        </div>
        {item.summary && (
          isRisk
            ? <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 leading-relaxed">⚠️ {item.summary}</p>
            : <p className="text-xs font-medium text-slate-600 leading-relaxed">{item.summary}</p>
        )}
        <div className="flex justify-end mt-1.5">
          <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1 text-[11px] text-[#D98A53] font-bold">
            詳細資訊
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/60 px-4 py-3 space-y-2 bg-white/40">
          <p className="text-xs font-medium text-slate-700 leading-relaxed">{item.assessment}</p>
          {item.riskDetails && (
            <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 leading-relaxed">⚠️ {item.riskDetails}</p>
          )}
          <p className="text-xs font-bold text-[#D98A53]">💡 {item.recommendation}</p>
        </div>
      )}
    </div>
  )
}

// ─── 主元件 ──────────────────────────────────────────────────────────────────

export default function IngredientAnalysis({ petId }: { petId: string }) {
  const [tab, setTab] = useState<'risk' | 'product' | 'nutri' | 'supp'>('risk')
  const [expandProd, setExpandProd] = useState<number>(0)
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  // 區分「無資料(空狀態)」與「載入失敗(可重試錯誤)」：
  // status='empty' → 尚無產品（後端回 422），顯示空狀態引導；
  // status='error' → 網路 / 伺服器錯誤，顯示錯誤提示並可重試。
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'empty' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)
  const [nutritionAi, setNutritionAi] = useState<NutritionAiResult | null>(null)
  const [nutritionAiLoading, setNutritionAiLoading] = useState(false)
  const [nutritionAiRunning, setNutritionAiRunning] = useState(false)

  useEffect(() => {
    if (!petId) return
    setLoading(true)
    setErrorMsg(null)
    setFetchStatus('idle')
    fetch(`/api/analysis?petId=${petId}`)
      .then(async (res) => {
        const json = await res.json() as AnalysisData | { error: string }
        if (!res.ok || 'error' in json) {
          const message = ('error' in json ? json.error : null) ?? '分析失敗，請稍後再試'
          setErrorMsg(message)
          setData(null)
          // 422 = 尚無使用中產品，屬「空狀態」而非載入失敗；其餘狀態碼皆視為錯誤。
          setFetchStatus(res.status === 422 ? 'empty' : 'error')
        } else {
          setData(json as AnalysisData)
          setFetchStatus('idle')
        }
      })
      .catch(() => {
        setErrorMsg('網路錯誤，請稍後再試')
        setData(null)
        setFetchStatus('error')
      })
      .finally(() => setLoading(false))
  }, [petId, refreshCount])

  // 載入已儲存的 AI 營養分析
  useEffect(() => {
    if (!petId) return
    setNutritionAiLoading(true)
    fetch(`/api/nutrition-ai?petId=${petId}`)
      .then(r => r.ok ? r.json() : null)
      .then((json: NutritionAiResult | null) => { if (json) setNutritionAi(json) })
      .catch(() => {})
      .finally(() => setNutritionAiLoading(false))
  }, [petId])

  // ── Loading 狀態 ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-8 h-8 border-2 border-[#D98A53] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">成分分析中...</p>
      </div>
    )
  }

  // ── 載入失敗狀態（網路 / 伺服器錯誤）：明確區分於「無資料」，提供重試 ──────
  if (fetchStatus === 'error') {
    return (
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
            <IconClipboardList />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">營養綜合分析表</h2>
        </div>
        <div className="bg-white rounded-[28px] border-2 border-slate-900/5 shadow-sm p-6 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#DC2626] text-2xl">
            <IconOctagonAlert size={24} />
          </div>
          <p className="font-bold text-slate-800">
            {errorMsg ?? '分析載入失敗'}
          </p>
          <p className="text-sm font-medium text-slate-400 leading-relaxed">
            載入分析時發生問題，請稍後再試
          </p>
          <button
            onClick={() => setRefreshCount(c => c + 1)}
            className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#D98A53] border border-slate-200 rounded-full px-4 py-2"
          >
            <IconRefreshCw size={13} /> 重新整理
          </button>
        </div>
      </div>
    )
  }

  // ── 無資料狀態（尚無使用中產品 / 後端 422）：空狀態引導，非錯誤 ──────────────
  if (!data) {
    return (
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
            <IconClipboardList />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">營養綜合分析表</h2>
        </div>
        <div className="bg-white rounded-[28px] border-2 border-slate-900/5 shadow-sm p-6 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FEF1E2] flex items-center justify-center text-[#D98A53] text-2xl">
            🐾
          </div>
          <p className="font-bold text-slate-800">
            {errorMsg ?? '尚無分析資料'}
          </p>
          <p className="text-sm font-medium text-slate-400 leading-relaxed">
            尚未加入任何產品，請至日誌 &gt; 使用中產品新增
          </p>
          <button
            onClick={() => setRefreshCount(c => c + 1)}
            className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#D98A53] border border-slate-200 rounded-full px-4 py-2"
          >
            <IconRefreshCw size={13} /> 重新整理
          </button>
        </div>
        <div className="mt-5">
          <AHowTo />
        </div>
      </div>
    )
  }

  const { pet, result, nutritionByProduct, analyzedAt } = data
  const s = result.stats

  // ── 執行 AI 營養分析 ────────────────────────────────────────────────────────
  async function runNutritionAi() {
    if (!petId || nutritionByProduct.length === 0) return
    setNutritionAiRunning(true)
    const nutrients = (() => {
      const merged: Record<string, { total: number; unit: string }> = {}
      for (const pn of nutritionByProduct) {
        for (const f of pn.facts ?? []) {
          if (!merged[f.name]) merged[f.name] = { total: 0, unit: f.unit }
          merged[f.name].total += f.value
        }
      }
      return Object.entries(merged).map(([name, { total, unit }]) => ({
        name, totalValue: parseFloat(total.toFixed(2)), unit,
      }))
    })()
    try {
      const res = await fetch('/api/nutrition-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, nutrients, productCount: nutritionByProduct.length }),
      })
      const json = await res.json() as NutritionAiResult
      if (res.ok) setNutritionAi(json)
    } catch { /* ignore */ }
    finally { setNutritionAiRunning(false) }
  }

  const TABS: Array<[typeof tab, string]> = [
    ['risk', '風險總覽'],
    ['product', `依產品 (${result.analyzedProducts.length})`],
    ['nutri', `營養表 (${nutritionByProduct.length})`],
    ['supp', `補充建議 (${result.supplements.filter(s => s.triggered).length})`],
  ]

  const analyzedAtLabel = (() => {
    try {
      return new Date(analyzedAt).toLocaleString('zh-TW')
    } catch {
      return analyzedAt
    }
  })()

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
          <IconClipboardList />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">營養綜合分析表</h2>
      </div>

      {/* 摘要卡片 */}
      <div className="bg-white rounded-[28px] border-2 border-slate-900/5 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          {/* 寵物頭像：優先用照片 */}
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#FFE8D6] flex items-center justify-center text-[#D98A53] font-bold text-lg shrink-0 border border-slate-900/5">
            {pet.avatar
              ? <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
              : pet.name.charAt(0)
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-slate-900">{pet.name} 的成分分析</h3>
            <p className="text-xs font-bold text-slate-400">
              分析 {result.analyzedProducts.length} 項產品 · 比對到 {s.totalIngredients} 種成分
            </p>
          </div>
          <button
            onClick={() => setRefreshCount(c => c + 1)}
            className="text-sm font-bold text-[#D98A53] hover:underline shrink-0"
          >
            重新整理
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {(
            [
              ['有毒', s.toxicCount, '#DC2626', '#FEF2F2'],
              ['警示', s.warningCount, '#C2410C', '#FFF7ED'],
              ['需注意', s.cautionCount, '#CA8A04', '#FEFCE8'],
              ['安全', s.safeCount, '#16A34A', '#F0FDF4'],
            ] as const
          ).map(([label, count, color, bg]) => (
            <div
              key={label}
              className="rounded-2xl py-3 flex flex-col items-center"
              style={{ backgroundColor: bg, border: '1px solid rgba(0,0,0,0.04)' }}
            >
              <span className="text-2xl font-bold" style={{ color }}>{count}</span>
              <span className="text-[11px] font-bold mt-0.5" style={{ color }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab 列 */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-5 gap-1">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all ${
              tab === key ? 'bg-[#111111] text-white shadow-sm' : 'text-slate-500 hover:text-black'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 風險總覽 */}
      {tab === 'risk' && (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* 有毒成分 */}
            {result.toxicItems.length > 0 && (
              <ACollapse title="☠ 有毒成分" count={result.toxicItems.length} color="#DC2626">
                <div className="space-y-2.5">
                  {result.toxicItems.map((it) => (
                    <div key={it.displayName} className="flex items-center justify-between bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ABadge kind="warn"><IconOctagonAlert size={11} /> 有毒</ABadge>
                        <span className="font-bold text-slate-900">{it.displayName}</span>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-bold text-slate-400">
                        {catLabel(it.category)} <IconChevronDown size={15} />
                      </span>
                    </div>
                  ))}
                </div>
              </ACollapse>
            )}

            {/* 警示成分 */}
            {result.warningItems.length > 0 && (
              <ACollapse title="⚠ 警示成分" count={result.warningItems.length} color="#C2410C">
                <div className="space-y-2.5">
                  {result.warningItems.map((it) => (
                    <div key={it.displayName} className="flex items-center justify-between bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ABadge kind="warn"><IconZap size={11} /> 警示</ABadge>
                        <span className="font-bold text-slate-900">{it.displayName}</span>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-bold text-slate-400">
                        {catLabel(it.category)} <IconChevronDown size={15} />
                      </span>
                    </div>
                  ))}
                </div>
              </ACollapse>
            )}

            {/* 需注意成分 */}
            {result.cautionItems.length > 0 && (
              <ACollapse title="⚡ 需注意成分" count={result.cautionItems.length} color="#CA8A04">
                <div className="space-y-2.5">
                  {result.cautionItems.map((it) => (
                    <div key={it.displayName} className="flex items-center justify-between bg-[#FEFCE8] border border-[#FDE68A] rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ABadge kind="caution"><IconZap size={11} /> 需注意</ABadge>
                        <span className="font-bold text-slate-900">{it.displayName}</span>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-bold text-slate-400">
                        {catLabel(it.category)} <IconChevronDown size={15} />
                      </span>
                    </div>
                  ))}
                </div>
              </ACollapse>
            )}

            {/* 📊 營養安全風險（從 nutritionByProduct 計算） */}
            {(() => {
              const RANGES: Record<string, { warnAbove?: number; cautionAbove?: number }> = {
                '粗灰分': { warnAbove: 8 },
                '鈣':     { cautionAbove: 1.2 },
                '磷':     { warnAbove: 1.6 },
                '鈉':     { warnAbove: 0.5 },
                '粗脂肪': { warnAbove: 25 },
              }
              const merged: Record<string, number> = {}
              for (const pn of nutritionByProduct) {
                for (const f of pn.facts ?? []) {
                  merged[f.name] = (merged[f.name] || 0) + f.value
                }
              }
              const riskNutrients = Object.entries(merged).filter(([name, total]) => {
                const cfg = RANGES[name]
                if (!cfg) return false
                return (cfg.warnAbove != null && total > cfg.warnAbove) ||
                       (cfg.cautionAbove != null && total > cfg.cautionAbove)
              })
              if (riskNutrients.length === 0) return null
              return (
                <ACollapse title={<><IconBarChart size={14} /> 營養安全風險</>} count={riskNutrients.length} color="#D97706">
                  <div className="space-y-2.5">
                    {riskNutrients.map(([name, total]) => {
                      const cfg = RANGES[name]!
                      const isWarn = cfg.warnAbove != null && total > cfg.warnAbove
                      return (
                        <div key={name} className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${isWarn ? 'bg-[#FFF7ED] border-[#FED7AA]' : 'bg-[#FEFCE8] border-[#FDE68A]'}`}>
                          <div className="flex items-center gap-2.5">
                            <ABadge kind={isWarn ? 'warn' : 'note'}>{isWarn ? '警示' : '留意'}</ABadge>
                            <span className="font-bold text-slate-900">{name}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-400">{total.toFixed(1)}%</span>
                        </div>
                      )
                    })}
                  </div>
                </ACollapse>
              )
            })()}

            {/* 安全成分 */}
            {result.safeItems.length > 0 && (
              <ACollapse title="✓ 安全成分" count={result.safeItems.length} color="#16A34A">
                <div className="space-y-2.5">
                  {result.safeItems.map((it) => (
                    <div key={it.displayName} className="flex items-center justify-between bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ABadge kind="safe"><IconCheck size={11} /> 安全</ABadge>
                        <span className="font-bold text-slate-900">{it.displayName}</span>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-bold text-slate-400">
                        {catLabel(it.category)} <IconChevronDown size={15} />
                      </span>
                    </div>
                  ))}
                </div>
              </ACollapse>
            )}

          {result.cautionItems.length === 0 && result.warningItems.length === 0 && result.toxicItems.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm font-bold text-green-700">未發現警示成分</p>
            </div>
          )}

          <AHowTo />
        </div>
      )}

      {/* 依產品 */}
      {tab === 'product' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {result.analyzedProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">尚無產品資料</p>
          ) : (
            result.analyzedProducts.map((p, i) => {
              // 使用 brand + name 作為 displayName，與 ingredientAnalyzer 一致
              const displayName = p.brand ? `${p.brand} ${p.name}` : p.name
              const prodIngredients = result.matched.filter(m => m.foundIn.includes(displayName))
              const toxicCount   = prodIngredients.filter(m => m.riskLevel === 'toxic').length
              const warningCount = prodIngredients.filter(m => m.riskLevel === 'warning').length
              const cautionCount = prodIngredients.filter(m => m.riskLevel === 'caution').length

              const badge = (() => {
                if (toxicCount > 0)   return <span className="text-[11px] px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold shrink-0">{toxicCount} 有毒</span>
                if (warningCount > 0) return <span className="text-[11px] px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold shrink-0">{warningCount} 警示</span>
                if (cautionCount > 0) return <span className="text-[11px] px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold shrink-0">{cautionCount} 注意</span>
                return null
              })()

              return (
                <div key={p.id} className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">{displayName}</h4>
                      <p className="text-xs font-bold text-slate-400">{productTypeLabel(p.type)} · {prodIngredients.length} 種已知成分</p>
                    </div>
                    {badge}
                    <button onClick={() => setExpandProd(expandProd === i ? -1 : i)} className="text-slate-400 shrink-0">
                      {expandProd === i ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                    </button>
                    <span className="text-slate-300 shrink-0"><IconPencil size={16} /></span>
                  </div>
                  {expandProd === i && (
                    <div className="mt-3">
                      {prodIngredients.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">尚無已識別成分資料</p>
                      ) : (
                        <div className="space-y-2">
                          {prodIngredients.map((it) => {
                            const isSafe    = it.riskLevel === 'safe'
                            const isWarn    = it.riskLevel === 'warning'
                            const isToxic   = it.riskLevel === 'toxic'
                            const bgCls = isSafe ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                              : isToxic   ? 'bg-[#FEF2F2] border-[#FECACA]'
                              : isWarn    ? 'bg-[#FFF7ED] border-[#FED7AA]'
                              : 'bg-[#FEFCE8] border-[#FDE68A]'
                            return (
                              <div key={it.displayName} className={`flex items-center justify-between rounded-2xl px-4 py-2.5 border ${bgCls}`}>
                                <div className="flex items-center gap-2.5">
                                  {isSafe  ? <ABadge kind="safe"><IconCheck size={11} /> 安全</ABadge>
                                   : isToxic ? <ABadge kind="warn"><IconOctagonAlert size={11} /> 有毒</ABadge>
                                   : isWarn  ? <ABadge kind="warn"><IconZap size={11} /> 警示</ABadge>
                                   : <ABadge kind="caution"><IconZap size={11} /> 需注意</ABadge>}
                                  <span className="font-bold text-slate-900">{it.displayName}</span>
                                </div>
                                <span className="flex items-center gap-1 text-sm font-bold text-slate-400">
                                  {catLabel(it.category)} <IconChevronDown size={15} />
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 營養表 */}
      {tab === 'nutri' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {nutritionByProduct.length === 0 ? (
            <div className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm p-6 text-center">
              <p className="text-sm font-bold text-slate-400">尚無詳細營養資料</p>
              <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">
                請用「照相」功能拍攝產品成分標示，AI 自動萃取後即可顯示營養數據
              </p>
            </div>
          ) : (() => {
            // 純聯集（frank 原始邏輯）：營養表只列「該毛孩所有產品實際有的營養素聯集」。
            // 同名加總、不同全列；有幾種就列幾種，產品沒有的不補列。
            // 門檻採 /analysis 完整規則（犬貓各自 min/warn），依當前寵物 species 取對應組；
            // 有對應門檻者做雙向示警（偏高/不足），無對應門檻者狀態顯示「—」，照常列出合計值。
            const speciesKey = resolveSpecies(pet.species)
            type MergedNutrient = { name: string; total: number; unit: string; sources: string[] }
            const merged: Record<string, MergedNutrient> = {}
            for (const pn of nutritionByProduct) {
              const sourceName = pn.productName ?? '未命名產品'
              for (const f of pn.facts ?? []) {
                if (!merged[f.name]) {
                  merged[f.name] = { name: f.name, total: 0, unit: f.unit, sources: [] }
                }
                merged[f.name].total += f.value
                if (!merged[f.name].sources.includes(sourceName)) merged[f.name].sources.push(sourceName)
              }
            }
            type NutriRow = {
              name: string
              total: number
              unit: string
              sources: string[]
              hasThreshold: boolean
              high: boolean
              low: boolean
              range: string
            }
            const rows: NutriRow[] = Object.values(merged).map((m) => {
              const t = NUTRIENT_THRESHOLDS[m.name]?.[speciesKey]
              const hasThreshold = !!t
              const high = !!(t?.warn != null && m.total > t.warn)
              const low = !high && !!(t?.min != null && m.total < t.min)
              return { name: m.name, total: m.total, unit: m.unit, sources: m.sources, hasThreshold, high, low, range: formatRange(t) }
            })
            const withNutrition = nutritionByProduct.filter(p => (p.facts?.length ?? 0) > 0)
            return (
              <>
                <div className="bg-[#FEF1E2] border border-[#F3D9BE] rounded-2xl p-4">
                  <p className="font-bold text-[#9A6233] mb-1">每日攝取量估算</p>
                  <p className="text-sm font-medium text-[#9A6233] leading-relaxed">
                    乾糧參考餵食量約為體重 × 2-3%。實際依產品說明為準。
                  </p>
                </div>
                <div className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="font-bold text-sm text-slate-800">各產品營養素合計（{withNutrition.length} 種產品）</span>
                    <span className="text-[11px] font-bold text-slate-400">加總估算值</span>
                  </div>
                  <table className="w-full text-left">
                    <thead className="text-[11px] font-bold text-slate-400 bg-slate-50">
                      <tr>
                        <th className="px-4 py-2">營養素</th>
                        <th className="px-2 py-2">合計</th>
                        <th className="px-2 py-2 hidden sm:table-cell">來源</th>
                        <th className="px-2 py-2">建議範圍</th>
                        <th className="px-3 py-2 text-right">AI 狀態</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((r) => (
                        <tr key={r.name} className="text-sm">
                          <td className="px-4 py-2.5 font-bold text-slate-700">{r.name}</td>
                          <td className={`px-2 py-2.5 font-bold ${r.high ? 'text-[#C2410C]' : r.low ? 'text-[#1D4ED8]' : 'text-slate-900'}`}>
                            {r.total}{r.unit}{r.high ? ' ⚠️' : r.low ? ' ▾' : ''}
                          </td>
                          <td className="px-2 py-2.5 hidden sm:table-cell">
                            {r.sources.map(s => (
                              <span key={s} className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded mr-1">{s}</span>
                            ))}
                          </td>
                          <td className="px-2 py-2.5 text-[11px] font-medium text-slate-400">{r.range}</td>
                          <td className="px-3 py-2.5 text-right">
                            {!r.hasThreshold ? (
                              <span className="text-[11px] font-bold text-slate-300">—</span>
                            ) : (
                              <ABadge kind={r.high ? 'warn' : r.low ? 'low' : 'safe'}>
                                {r.high ? '警示' : r.low ? '不足' : '正常'}
                              </ABadge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[11px] font-medium text-slate-400 px-4 py-3">
                    * 表格列出該毛孩所有產品實際標示的營養素（同名加總）。門檻依{speciesKey === 'cat' ? '貓' : '犬'}的 AAFCO 標準對照；無對照標準的營養素僅顯示合計值（狀態「—」），可透過 AI 分析獲得建議
                  </p>
                </div>
              </>
            )
          })()}

          {/* ── AI 整體評估 ─────────────────────────────────────────────────── */}
          {nutritionAiLoading && (
            <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              載入 AI 分析紀錄…
            </div>
          )}

          {!nutritionAiLoading && !nutritionAi && nutritionByProduct.length > 0 && (
            <button
              onClick={runNutritionAi}
              disabled={nutritionAiRunning}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#D98A53] to-[#E8A070] text-white rounded-2xl font-bold text-sm shadow-sm disabled:opacity-50"
            >
              {nutritionAiRunning
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> AI 分析中…</>
                : <>✨ AI 深度分析營養安全性</>
              }
            </button>
          )}

          {nutritionAi && (() => {
            // 防護：已儲存紀錄 / AI 回傳形狀可能不完整（缺 items / generalRecommendations），
            // 缺漏時以空陣列代替，避免 .some / .map / .length 在 undefined 上 crash。
            const aiItems = nutritionAi.items ?? []
            const aiGeneralRecs = nutritionAi.generalRecommendations ?? []
            const hasRisk = aiItems.some(i => i.status === 'warning' || i.status === 'danger')
            const savedDate = nutritionAi.savedAt
              ? new Date(nutritionAi.savedAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : null
            return (
              <div className="space-y-4">
                {/* 整體評估卡片 */}
                <div className={`rounded-2xl border p-4 ${hasRisk ? 'bg-[#FFF7ED] border-[#FED7AA]' : 'bg-[#F0FDF4] border-[#BBF7D0]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{hasRisk ? '⚠️' : '✅'}</span>
                      <p className="font-bold text-slate-900">AI 整體評估</p>
                    </div>
                    <button
                      onClick={runNutritionAi}
                      disabled={nutritionAiRunning}
                      className="flex items-center gap-1 text-xs font-bold text-[#D98A53] border border-[#D98A53]/30 bg-white/70 px-2 py-1 rounded-lg disabled:opacity-40"
                    >
                      <IconRefreshCw size={13} />
                      {nutritionAiRunning ? '分析中…' : '重新分析'}
                    </button>
                  </div>
                  {savedDate && (
                    <p className="text-[11px] font-bold text-slate-400 mb-2">上次分析：{savedDate}</p>
                  )}
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">{nutritionAi.overall ?? ''}</p>
                </div>

                {/* 各營養素分析（無資料時略過此區） */}
                {aiItems.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-500">各營養素分析</p>
                    {aiItems.map((item, i) => (
                      <NutrientCard key={i} item={item} />
                    ))}
                  </div>
                )}

                {/* 整體建議 */}
                {aiGeneralRecs.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <p className="font-bold text-slate-800 mb-3">整體建議</p>
                    <ul className="space-y-2">
                      {aiGeneralRecs.map((rec, i) => (
                        <li key={i} className="flex gap-2 text-sm font-medium text-slate-600 leading-relaxed">
                          <span className="text-[#D98A53] shrink-0 mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 資料來源 */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
              <span className="text-slate-500">資料參考來源：</span>{A_REFS}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="font-bold text-slate-800 mb-2 text-sm">說明</p>
            <ul className="text-xs font-medium text-slate-500 leading-relaxed space-y-1">
              <li>· 表格列出該毛孩所有產品實際標示的營養素，同名加總、有幾種列幾種</li>
              <li>· 合計值為各產品標示值直接加總，代表最高負荷上限估算，實際依產品說明為準</li>
              <li>· <span className="text-[#C2410C] font-bold">橘色/警示</span>：合計超過 AAFCO 建議上限</li>
              <li>· <span className="text-[#1D4ED8] font-bold">藍色/不足</span>：標示加總低於 AAFCO 最低需求，僅供參考</li>
              <li>· 門檻依當前寵物物種（犬/貓）分別對照</li>
              <li>· AI 分析結合寵物體型與物種，提供個人化建議，僅供參考</li>
              <li>※ AAFCO = 美國飼料管理協會（Association of American Feed Control Officials）</li>
            </ul>
          </div>
        </div>
      )}

      {/* 補充建議 */}
      {tab === 'supp' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <p className="text-sm font-bold text-slate-400">根據 {pet.name} 的症狀記錄，建議補充以下營養：</p>
          {result.supplements.filter(sup => sup.triggered).length === 0 ? (
            <div className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm p-6 text-center">
              <p className="text-sm font-bold text-slate-400">尚無特別建議</p>
              <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">
                在「日誌」頁記錄症狀後，系統將自動產生針對性的補充建議
              </p>
            </div>
          ) : (
            result.supplements.filter(sup => sup.triggered).map((sup) => (
              <div
                key={sup.name}
                className={`rounded-[24px] p-5 border ${
                  sup.priority === 'high'
                    ? 'bg-[#FEF2F2] border-[#FECACA]'
                    : sup.priority === 'medium'
                    ? 'bg-[#FFFBEB] border-[#FDE68A]'
                    : 'bg-[#F0FDF4] border-[#BBF7D0]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: sup.priority === 'high' ? '#DC2626' : sup.priority === 'medium' ? '#CA8A04' : '#16A34A' }}
                    />
                    {sup.name}
                  </h4>
                  <span
                    className="text-xs font-bold"
                    style={{ color: sup.priority === 'high' ? '#B91C1C' : sup.priority === 'medium' ? '#92400E' : '#166534' }}
                  >
                    {sup.priority === 'high' ? '強烈建議' : sup.priority === 'medium' ? '建議' : '可考慮'}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-600 leading-relaxed mb-3">{sup.reason}</p>
                <p className="text-xs font-bold text-slate-400">建議來源：{sup.examples}</p>
              </div>
            ))
          )}
          <p className="text-[11px] font-bold text-slate-400 px-1">上次分析：{analyzedAtLabel}</p>
          <AHowTo />
        </div>
      )}
    </div>
  )
}
