'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { productTypeLabel } from '@/lib/utils'
import Link from 'next/link'
import type { IngredientAnalysisResult, MatchedIngredient, ProductSummary } from '@/lib/ingredientAnalyzer'
import ProductEditModal from '@/components/product/ProductEditModal'
import type { ProductForEdit } from '@/components/product/ProductEditModal'

interface Pet {
  id: string
  name: string
  species: string
  weight?: number | null
  avatar?: string | null
}

interface NutritionalFact { name: string; value: number; unit: string }
interface ProductNutrition { productId: string; productName: string; facts: NutritionalFact[] }

interface AnalysisResponse {
  pet: Pet
  result: IngredientAnalysisResult
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
  savedAt?: string       // ISO string，有值表示已儲存的紀錄
  productCount?: number
}

interface ProductRecAlt {
  productName: string
  reason: string
  keyFeatures: string[]
  avoid: string[]
  searchTip: string
}
interface ProductRec {
  forProduct: string
  alternatives: ProductRecAlt[]
}

// 每 100g 乾物質的建議範圍（%）
// min: 最低需求  warn: 超過此值需注意
const NUTRIENT_THRESHOLDS: Record<string, { dog?: { min?: number; warn?: number }; cat?: { min?: number; warn?: number }; unit?: string }> = {
  '粗蛋白':  { dog: { min: 18, warn: 40 }, cat: { min: 26, warn: 55 } },
  '粗脂肪':  { dog: { min: 5.5, warn: 25 }, cat: { min: 9, warn: 35 } },
  '粗纖維':  { dog: { warn: 8 }, cat: { warn: 8 } },
  '水分':    { dog: { warn: 78 }, cat: { warn: 78 } },
  '鈉':      { dog: { min: 0.08, warn: 0.5 }, cat: { min: 0.2, warn: 0.8 } },
  '鈣':      { dog: { min: 0.5, warn: 2.5 }, cat: { min: 0.3, warn: 2.0 } },
  '磷':      { dog: { min: 0.4, warn: 1.6 }, cat: { min: 0.5, warn: 2.0 } },
}

const RISK_CONFIG = {
  toxic:   { label: '⚠️ 有毒',    bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-700',    badge: 'bg-red-500 text-white' },
  warning: { label: '⛔ 警示',    bg: 'bg-orange-50',  border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-500 text-white' },
  caution: { label: '⚡ 需注意',  bg: 'bg-yellow-50',  border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-400 text-white' },
  safe:    { label: '✓ 安全',     bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-500 text-white' },
}

const CATEGORY_LABELS: Record<string, string> = {
  protein: '蛋白質', carb: '碳水', fat: '油脂', fiber: '纖維',
  vitamin: '維生素', mineral: '礦物質', probiotic: '益生菌',
  functional: '功能性', additive: '添加劑', preservative: '防腐劑',
  harmful: '有害', other: '其他',
}

const PRIORITY_CONFIG = {
  high:   { label: '強烈建議', bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500' },
  medium: { label: '建議補充', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  low:    { label: '可考慮',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-400' },
}

// AI 營養狀態設定（模組層級，可跨 tab 共用）
const NUTRITION_STATUS_CONFIG = {
  safe:    { label: '安全', bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',  icon: '✅' },
  caution: { label: '留意', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: '⚡' },
  warning: { label: '警示', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: '⛔' },
  danger:  { label: '危險', bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',      icon: '🚨' },
} as const

// ── CollapsibleGroup: 可收折的分區 ─────────────────────────────────────────────
function CollapsibleGroup({
  label, colorCls, children, defaultOpen = true,
}: {
  label: React.ReactNode; colorCls: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between py-4 ${colorCls}`}
      >
        <span className="font-semibold text-sm flex items-center gap-1.5">{label}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          className={`w-4 h-4 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="pb-3 space-y-1.5">{children}</div>}
    </div>
  )
}

// ── NutrientCard: summary + expandable details ────────────────────────────────
interface NutrientCfg {
  label: string; bg: string; border: string; badge: string; icon: string
}
function NutrientCard({ item, cfg, isRisk }: {
  item: NutritionAiItem
  cfg: NutrientCfg
  isRisk: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* ── Summary row ── */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base leading-none">{cfg.icon}</span>
          <p className="font-semibold text-sm text-[#1a1a2e] flex-1">{item.nutrient}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.badge}`}>{cfg.label}</span>
        </div>
        {/* Summary — AI-generated condensed summary from second pass */}
        {item.summary ? (
          isRisk ? (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 leading-relaxed">
              ⚠️ {item.summary}
            </p>
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed">{item.summary}</p>
          )
        ) : null}
        {/* 詳細資訊 toggle */}
        <div className="flex justify-end mt-1.5">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-[#4F7CFF] font-medium"
          >
            詳細資訊
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
              className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>
      {/* ── Expanded details ── */}
      {open && (
        <div className="border-t border-white/60 px-3 py-3 space-y-2 bg-white/40">
          <p className="text-xs text-gray-700 leading-relaxed">{item.assessment}</p>
          {item.riskDetails && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 leading-relaxed">
              ⚠️ {item.riskDetails}
            </p>
          )}
          <p className="text-xs text-[#4F7CFF] font-medium">💡 {item.recommendation}</p>
        </div>
      )}
    </div>
  )
}

function IngredientRow({ item, defaultOpen = false }: { item: MatchedIngredient; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const cfg = RISK_CONFIG[item.riskLevel]
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
          {cfg.label}
        </span>
        <span className="flex-1 font-medium text-sm text-[#1a1a2e]">{item.displayName}</span>
        <span className="text-xs text-gray-400 shrink-0">{CATEGORY_LABELS[item.category]}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-gray-700 leading-relaxed">{item.effect}</p>
          {item.tip && (
            <p className="text-xs font-medium text-[#4F7CFF] bg-blue-50 rounded-lg px-2 py-1.5">
              💡 {item.tip}
            </p>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {item.foundIn.map((p, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-white rounded-full border border-gray-200 text-gray-500">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ProductWithIngredients extends ProductSummary {
  displayName: string
  ingredients: MatchedIngredient[]
}

function ProductCard({
  prod,
  onEditRequest,
}: {
  prod: ProductWithIngredients
  onEditRequest: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const toxic = prod.ingredients.filter((i) => i.riskLevel === 'toxic').length
  const warning = prod.ingredients.filter((i) => i.riskLevel === 'warning').length
  const caution = prod.ingredients.filter((i) => i.riskLevel === 'caution').length

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          className="flex-1 flex items-center gap-3 text-left min-w-0"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#1a1a2e] truncate">{prod.displayName}</p>
            <p className="text-xs text-gray-400">{productTypeLabel(prod.type)} · {prod.ingredients.length} 種已知成分</p>
          </div>
          <div className="shrink-0">
            {(() => {
              if (toxic > 0) return <span className="text-[11px] px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">{toxic} 有毒</span>
              if (warning > 0) return <span className="text-[11px] px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold">{warning} 警示</span>
              if (caution > 0) return <span className="text-[11px] px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">{caution} 注意</span>
              return null
            })()}
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {/* Edit ingredients button */}
        <button
          title="修改成分"
          onClick={() => onEditRequest(prod.id)}
          className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-50 pt-2">
          {prod.ingredients.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">未比對到已知成分，建議補充成分資料</p>
          ) : (
            prod.ingredients.map((item, i) => (
              <IngredientRow key={i} item={item} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function AnalysisPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [currentPetId, setCurrentPetId] = useState<string>('')
  const [data, setData] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'risk' | 'byProduct' | 'nutrition' | 'supplements'>('risk')
  const [editingProduct, setEditingProduct] = useState<ProductForEdit | null>(null)
  const [nutritionAiResult, setNutritionAiResult] = useState<NutritionAiResult | null>(null)
  const [nutritionAiLoading, setNutritionAiLoading] = useState(false)
  const [nutritionAiSavedLoading, setNutritionAiSavedLoading] = useState(false)
  const [nutritionAiError, setNutritionAiError] = useState('')
  const [recResult, setRecResult] = useState<ProductRec[] | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState('')
  const [recSavedAt, setRecSavedAt] = useState<string | null>(null)
  const [recSavedLoading, setRecSavedLoading] = useState(false)

  useEffect(() => {
    fetch('/api/pets')
      .then((r) => r.json())
      .then((data: Pet[]) => {
        // 401（未登入 / session 過期）回傳的是 { error }，先正規化避免當成陣列操作
        const list = Array.isArray(data) ? data : []
        setPets(list)
        if (list.length > 0) setCurrentPetId(list[0].id)
      })
      .catch(() => setError('無法載入寵物資料'))
  }, [])

  const runAnalysis = useCallback(async (petId: string) => {
    if (!petId) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch(`/api/analysis?petId=${petId}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || '分析失敗'); return }
      setData(json)
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!currentPetId) return
    runAnalysis(currentPetId)
    // 同時載入該寵物最新的儲存分析
    setNutritionAiResult(null)
    setNutritionAiError('')
    setNutritionAiSavedLoading(true)
    fetch(`/api/nutrition-ai?petId=${currentPetId}`)
      .then((r) => r.json())
      .then((json) => { if (json) setNutritionAiResult(json) })
      .catch(() => { /* 無已儲存結果，忽略 */ })
      .finally(() => setNutritionAiSavedLoading(false))
    // 同時載入該寵物最新的 AI 產品推薦
    setRecResult(null)
    setRecSavedAt(null)
    setRecError('')
    setRecSavedLoading(true)
    fetch(`/api/recommend?petId=${currentPetId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.recommendations) {
          setRecResult(json.recommendations)
          setRecSavedAt(json.savedAt ?? null)
        }
      })
      .catch(() => { /* 無已儲存結果，忽略 */ })
      .finally(() => setRecSavedLoading(false))
  }, [currentPetId, runAnalysis])

  const handleEditRequest = useCallback(async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (!res.ok) return
      const product = await res.json()
      setEditingProduct(product)
    } catch { /* ignore */ }
  }, [])

  const runNutritionAi = useCallback(async (
    nutrients: { name: string; totalValue: number; unit: string }[],
    productCount: number
  ) => {
    if (!currentPetId || nutrients.length === 0) return
    setNutritionAiLoading(true)
    setNutritionAiError('')
    setNutritionAiResult(null)
    try {
      const res = await fetch('/api/nutrition-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: currentPetId, nutrients, productCount }),
      })
      const json = await res.json()
      if (!res.ok) { setNutritionAiError(json.error || '分析失敗'); return }
      setNutritionAiResult(json)
    } catch {
      setNutritionAiError('網路錯誤，請稍後再試')
    } finally {
      setNutritionAiLoading(false)
    }
  }, [currentPetId])

  const runRecommend = useCallback(async (
    riskyProducts: Array<{ name: string; brand?: string; type: string; risks: string[]; riskLevel: 'danger' | 'warning' | 'caution' }>
  ) => {
    if (!currentPetId || riskyProducts.length === 0) return
    setRecLoading(true)
    setRecError('')
    setRecResult(null)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: currentPetId, riskyProducts }),
      })
      const json = await res.json()
      if (!res.ok) { setRecError(json.error || '推薦失敗'); return }
      setRecResult(json.recommendations)
      setRecSavedAt(json.savedAt ?? null)
    } catch {
      setRecError('網路錯誤，請稍後再試')
    } finally {
      setRecLoading(false)
    }
  }, [currentPetId])

  const result = data?.result
  const currentPet = pets.find((p) => p.id === currentPetId)
  const speciesEmoji = currentPet?.species === '狗' ? '🐕' : currentPet?.species === '貓' ? '🐈' : '🐾'

  // 依產品分組：每個產品對應其匹配到的成分
  const byProduct: ProductWithIngredients[] = result
    ? result.analyzedProducts.map((prod) => {
        const displayName = `${prod.brand ? prod.brand + ' ' : ''}${prod.name}`
        const ingredients = result.matched.filter((item) =>
          item.foundIn.includes(displayName)
        )
        return { ...prod, displayName, ingredients }
      })
    : []

  const nutritionByProduct: ProductNutrition[] = useMemo(
    () => (data as AnalysisResponse | null)?.nutritionByProduct ?? [],
    [data]
  )

  // 彙整有風險的產品（useMemo 確保穩定，供 runRecommend 使用）
  const riskyProductsForRec = useMemo(() => {
    if (!result) return []
    const map = new Map<string, { name: string; brand?: string; type: string; risks: string[]; riskLevel: 'danger' | 'warning' | 'caution' }>()
    const priority: Record<string, number> = { danger: 3, warning: 2, caution: 1 }
    const add = (productDisplayName: string, ingredientName: string, level: 'danger' | 'warning' | 'caution') => {
      const existing = map.get(productDisplayName)
      if (existing) {
        if (!existing.risks.includes(ingredientName)) existing.risks.push(ingredientName)
        if (priority[level] > priority[existing.riskLevel]) existing.riskLevel = level
      } else {
        const prod = result.analyzedProducts.find(
          (p) => `${p.brand ? p.brand + ' ' : ''}${p.name}` === productDisplayName || p.name === productDisplayName
        )
        map.set(productDisplayName, {
          name: prod?.name || productDisplayName,
          brand: prod?.brand ?? undefined,
          type: prod?.type || 'other',
          risks: [ingredientName],
          riskLevel: level,
        })
      }
    }
    // 有毒／警示成分的產品
    result.toxicItems.forEach((item) => item.foundIn.forEach((p) => add(p, item.displayName, 'danger')))
    result.warningItems.forEach((item) => item.foundIn.forEach((p) => add(p, item.displayName, 'warning')))

    // 含有 AI 警示或危險營養素的產品（例如磷超標）
    if (nutritionAiResult && nutritionByProduct.length > 0) {
      const riskNutrients = nutritionAiResult.items.filter(
        (i) => i.status === 'warning' || i.status === 'danger'
      )
      riskNutrients.forEach((nutrientItem) => {
        nutritionByProduct.forEach((prodNutr) => {
          const hasFact = prodNutr.facts.some((f) => f.name === nutrientItem.nutrient)
          if (!hasFact) return
          const prod = result.analyzedProducts.find(
            (p) => p.id === prodNutr.productId || p.name === prodNutr.productName
          )
          const displayName = prod
            ? `${prod.brand ? prod.brand + ' ' : ''}${prod.name}`
            : prodNutr.productName
          const level = nutrientItem.status === 'danger' ? 'danger' : 'warning'
          add(displayName, nutrientItem.nutrient, level)
        })
      })
    }

    return Array.from(map.values())
  }, [result, nutritionAiResult, nutritionByProduct])

  // Collect all unique nutrient names across all products
  const allNutrientNames = Array.from(
    new Set(nutritionByProduct.flatMap((p) => p.facts.map((f) => f.name)))
  )

  const tabs = [
    { key: 'risk',        label: '風險總覽' },
    { key: 'byProduct',   label: `依產品${result ? ` (${result.analyzedProducts.length})` : ''}` },
    { key: 'nutrition',   label: `營養表${nutritionByProduct.length ? ` (${nutritionByProduct.length})` : ''}` },
    { key: 'supplements', label: `補充建議${result ? ` (${result.supplements.length})` : ''}` },
  ] as const

  return (
    <div>
      <PageHeader title="成分綜合分析" />

      <div className="px-4 py-4 space-y-3 pb-24">
        {/* Pet selector */}
        {pets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pets.map((pet) => (
              <button
                key={pet.id}
                onClick={() => setCurrentPetId(pet.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                  currentPetId === pet.id
                    ? 'bg-[#4F7CFF] text-white border-[#4F7CFF]'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                <span>{pet.species === '狗' ? '🐕' : pet.species === '貓' ? '🐈' : '🐾'}</span>
                <span>{pet.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 space-y-1">
            <p>{error}</p>
            {error.includes('日誌') && (
              <Link href="/log/new" className="block font-medium text-[#4F7CFF] mt-1">→ 前往新增食品/用品記錄</Link>
            )}
            {error.includes('日誌') && (
              <Link href="/upload" className="block font-medium text-[#4F7CFF]">→ 上傳成分表照片</Link>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <Card>
            <CardContent>
              <div className="flex items-center gap-3 py-2">
                <div className="w-5 h-5 border-2 border-[#4F7CFF] border-t-transparent rounded-full animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#1a1a2e]">成分比對中…</p>
                  <p className="text-xs text-gray-400">根據內建知識庫即時分析，無需等待</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && currentPet && (
          <>
            {/* Summary header */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-2.5">
                  {currentPet.avatar ? (
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-100 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={currentPet.avatar} alt={currentPet.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <span className="text-2xl">{speciesEmoji}</span>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-[#1a1a2e]">{currentPet.name} 的成分分析</p>
                    <p className="text-xs text-gray-400">
                      分析 {result.analyzedProducts.length} 項產品 · 比對到 {result.stats.totalIngredients} 種成分
                    </p>
                  </div>
                  <button
                    onClick={() => runAnalysis(currentPetId)}
                    className="text-xs text-[#4F7CFF] font-medium"
                  >
                    重新整理
                  </button>
                </div>

                {/* Risk stats */}
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  {[
                    { label: '有毒',   count: result.stats.toxicCount,   color: 'text-red-600 bg-red-50' },
                    { label: '警示',   count: result.stats.warningCount, color: 'text-orange-600 bg-orange-50' },
                    { label: '需注意', count: result.stats.cautionCount, color: 'text-yellow-600 bg-yellow-50' },
                    { label: '安全',   count: result.stats.safeCount,    color: 'text-green-600 bg-green-50' },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl py-2 text-center ${s.color}`}>
                      <p className="font-bold text-lg leading-none">{s.count}</p>
                      <p className="text-[10px] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Toxic alert */}
            {result.toxicItems.length > 0 && (
              <div className="bg-red-500 text-white rounded-2xl p-4 space-y-2">
                <p className="font-bold text-sm">⚠️ 發現有毒成分！</p>
                {result.toxicItems.map((item, i) => (
                  <div key={i} className="bg-red-600/50 rounded-xl p-2.5">
                    <p className="font-semibold text-sm">{item.displayName}</p>
                    <p className="text-xs opacity-90 mt-0.5">{item.effect}</p>
                    {item.tip && <p className="text-xs font-medium mt-1 opacity-90">{item.tip}</p>}
                    <p className="text-xs opacity-75 mt-1">
                      出現於：{item.foundIn.join('、')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 text-xs font-semibold transition-all rounded-lg ${
                    activeTab === tab.key
                      ? 'bg-[#111111] text-white shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Risk overview */}
            {activeTab === 'risk' && (
              <div className="space-y-3">
                {result.warningItems.length > 0 && (
                  <CollapsibleGroup
                    colorCls="text-orange-600"
                    label={<>⛔ 警示成分 <span className="text-orange-400">({result.warningItems.length})</span></>}
                  >
                    {result.warningItems.map((item, i) => (
                      <IngredientRow key={i} item={item} defaultOpen={false} />
                    ))}
                  </CollapsibleGroup>
                )}
                {result.cautionItems.length > 0 && (
                  <CollapsibleGroup
                    colorCls="text-amber-600"
                    label={<>⚡ 需注意成分 <span className="text-amber-400">({result.cautionItems.length})</span></>}
                  >
                    {result.cautionItems.map((item, i) => (
                      <IngredientRow key={i} item={item} />
                    ))}
                  </CollapsibleGroup>
                )}

                {/* AI 營養安全風險（有分析結果時顯示） */}
                {nutritionAiResult && (() => {
                  const riskItems = nutritionAiResult.items.filter(
                    (i) => i.status === 'danger' || i.status === 'warning' || i.status === 'caution'
                  )
                  if (riskItems.length === 0) return null
                  return (
                    <CollapsibleGroup
                      colorCls="text-amber-600"
                      label={<>📊 營養安全風險 <span className="text-amber-400">({riskItems.length})</span></>}
                    >
                      {riskItems.map((item, i) => {
                        const cfg = NUTRITION_STATUS_CONFIG[item.status]
                        const isRisk = item.status === 'warning' || item.status === 'danger'
                        return <NutrientCard key={i} item={item} cfg={cfg} isRisk={isRisk} />
                      })}
                    </CollapsibleGroup>
                  )
                })()}

                {result.warningItems.length === 0 && result.cautionItems.length === 0 && !nutritionAiResult && (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-2">✅</p>
                    <p className="text-sm font-medium text-green-700">未發現警示或需注意的成分</p>
                    <p className="text-xs text-gray-400 mt-1">繼續補充成分表資料以獲得更完整分析</p>
                  </div>
                )}
                {result.safeItems.length > 0 && (
                  <CollapsibleGroup
                    colorCls="text-green-700"
                    defaultOpen={false}
                    label={<>✓ 安全成分 <span className="text-green-400">({result.safeItems.length})</span></>}
                  >
                    {result.safeItems.map((item, i) => (
                      <IngredientRow key={i} item={item} />
                    ))}
                  </CollapsibleGroup>
                )}

                {/* ── AI 產品推薦 ── */}
                {(riskyProductsForRec.length > 0 || recResult || recLoading || recSavedLoading) && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">🛒</span>
                          <p className="font-semibold text-sm text-[#1a1a2e] flex-1">AI 產品替代推薦</p>
                        </div>
                        <p className="text-xs text-gray-400">根據風險成分與寵物健康狀況，推薦具體的替代產品</p>
                      </div>

                      {recSavedLoading && (
                        <div className="px-4 pb-4 text-center">
                          <div className="w-5 h-5 border-2 border-gray-200 border-t-[#4F7CFF] rounded-full animate-spin mx-auto" />
                        </div>
                      )}

                      {!recSavedLoading && !recResult && !recLoading && (
                        <div className="px-4 pb-4">
                          <button
                            onClick={() => runRecommend(riskyProductsForRec)}
                            className="w-full py-3 bg-gradient-to-r from-[#4F7CFF] to-[#6B8FFF] text-white rounded-xl font-medium text-sm shadow-sm active:opacity-90"
                          >
                            取得 AI 替代品建議
                          </button>
                          {recError && <p className="text-xs text-red-500 mt-2 text-center">{recError}</p>}
                        </div>
                      )}

                      {recLoading && (
                        <div className="px-4 pb-4 text-center space-y-1.5">
                          <div className="w-6 h-6 border-2 border-[#4F7CFF] border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-xs text-gray-400">AI 正在分析替代品建議…</p>
                        </div>
                      )}

                      {recResult && recResult.length > 0 && (
                        <div className="divide-y divide-gray-100">
                          {recResult.map((rec, ri) => {
                            const prodInfo = riskyProductsForRec.find(
                              (p) => p.name === rec.forProduct || `${p.brand ? p.brand + ' ' : ''}${p.name}` === rec.forProduct
                            )
                            const isD = prodInfo?.riskLevel === 'danger'
                            return (
                              <div key={ri} className="px-4 pt-4 pb-3 space-y-3">
                                {/* ── 目前使用的產品（有問題的） ── */}
                                <div className={`rounded-xl p-3 border ${isD ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                                  <p className={`text-[10px] font-semibold mb-1 ${isD ? 'text-red-500' : 'text-orange-500'}`}>
                                    {isD ? '⛔ 有毒成分 — 建議替換' : '⚠️ 警示成分 — 建議替換'}
                                  </p>
                                  <p className="text-sm font-bold text-gray-800">{prodInfo?.name || rec.forProduct}</p>
                                  {prodInfo?.brand && <p className="text-xs text-gray-500 mt-0.5">{prodInfo.brand}</p>}
                                  {prodInfo?.risks && prodInfo.risks.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      <span className="text-[10px] text-gray-400 self-center">問題成分：</span>
                                      {prodInfo.risks.map((r, rIdx) => (
                                        <span key={rIdx} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isD ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{r}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* ── 建議替代方向 ── */}
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-400 mb-1.5 px-0.5">推薦替代產品</p>
                                  <div className="space-y-2">
                                    {rec.alternatives.map((alt, ai) => (
                                      <div key={ai} className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                                        <p className="text-sm font-bold text-[#4F7CFF]">{alt.productName}</p>
                                        <p className="text-xs text-gray-600 leading-relaxed">{alt.reason}</p>
                                        {alt.keyFeatures.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {alt.keyFeatures.map((f, fi) => (
                                              <span key={fi} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ {f}</span>
                                            ))}
                                          </div>
                                        )}
                                        {alt.avoid.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {alt.avoid.map((a, ai2) => (
                                              <span key={ai2} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">✕ 避開 {a}</span>
                                            ))}
                                          </div>
                                        )}
                                        <p className="text-[10px] text-gray-400 leading-relaxed">💡 {alt.searchTip}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-50">
                            {recSavedAt && (
                              <p className="text-[10px] text-gray-300">
                                {new Date(recSavedAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            <button
                              onClick={() => runRecommend(riskyProductsForRec)}
                              disabled={recLoading}
                              className="text-xs text-[#4F7CFF] font-medium ml-auto disabled:opacity-40"
                            >
                              {recLoading ? '更新中…' : '重新取得建議'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }
              </div>
            )}

            {/* Tab: By product */}
            {activeTab === 'byProduct' && (
              <div className="space-y-2">
                {byProduct.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2">🔍</p>
                    <p className="text-sm text-gray-500">尚無產品成分資料</p>
                    <p className="text-xs text-gray-400 mt-1">上傳成分表照片或在日誌中新增產品後自動顯示</p>
                    <Link href="/upload" className="inline-block mt-3 text-sm text-[#4F7CFF] font-medium">
                      → 上傳成分表
                    </Link>
                  </div>
                ) : (
                  <>
                    {byProduct.map((prod) => (
                      <ProductCard key={prod.id} prod={prod} onEditRequest={handleEditRequest} />
                    ))}
                    <Link
                      href="/upload"
                      className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-[#4F7CFF] hover:text-[#4F7CFF] transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      上傳新產品成分表
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Tab: Nutrition table */}
            {activeTab === 'nutrition' && (() => {
              // 計算各營養素加總
              const nutrientTotals = allNutrientNames.map((name) => {
                const total = nutritionByProduct.reduce((sum, p) => {
                  const fact = p.facts.find((f) => f.name === name)
                  return sum + (fact?.value || 0)
                }, 0)
                const unit = nutritionByProduct.flatMap((p) => p.facts).find((f) => f.name === name)?.unit || '%'
                return { name, totalValue: parseFloat(total.toFixed(2)), unit }
              })
              const speciesKey = currentPet?.species === '貓' ? 'cat' : 'dog'

              return (
                <div className="space-y-3">
                  {nutritionByProduct.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-3xl mb-2">📊</p>
                      <p className="text-sm text-gray-500">尚無營養成分數據</p>
                      <p className="text-xs text-gray-400 mt-1">上傳含有「保證分析值」的產品標示後自動顯示</p>
                      <Link href="/upload" className="inline-block mt-3 text-sm text-[#4F7CFF] font-medium">
                        → 上傳成分表
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* 估算說明 */}
                      {data?.pet.weight && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                          <p className="font-medium mb-0.5">每日攝取量估算（{data.pet.name} {data.pet.weight}kg）</p>
                          <p>乾糧參考餵食量約為體重 × 2–3%，即 {(data.pet.weight * 25).toFixed(0)}–{(data.pet.weight * 30).toFixed(0)} g/天。實際依產品說明為準。</p>
                        </div>
                      )}

                      {/* ── 各產品逐列對比表 ── */}
                      {allNutrientNames.length > 0 && nutritionByProduct.length > 1 && (
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 px-3 pt-3 pb-1">各產品比較</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                  <th className="text-left px-3 py-2 font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[80px]">項目</th>
                                  {nutritionByProduct.map((p) => (
                                    <th key={p.productId} className="text-center px-2 py-2 font-medium text-gray-600 min-w-[72px]">
                                      {p.productName.length > 8 ? p.productName.slice(0, 8) + '…' : p.productName}
                                    </th>
                                  ))}
                                  <th className="text-center px-2 py-2 font-medium text-gray-400 min-w-[72px]">建議範圍</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allNutrientNames.map((nutrientName) => {
                                  const threshold = NUTRIENT_THRESHOLDS[nutrientName]?.[speciesKey]
                                  const rangeLabel = threshold
                                    ? [
                                        threshold.min !== undefined ? `≥${threshold.min}%` : '',
                                        threshold.warn !== undefined ? `<${threshold.warn}%` : '',
                                      ].filter(Boolean).join(' ')
                                    : '—'
                                  return (
                                    <tr key={nutrientName} className="border-b border-gray-50 last:border-0">
                                      <td className="px-3 py-2 font-medium text-gray-700 sticky left-0 bg-white">{nutrientName}</td>
                                      {nutritionByProduct.map((p) => {
                                        const fact = p.facts.find((f) => f.name === nutrientName)
                                        if (!fact) return <td key={p.productId} className="text-center px-2 py-2 text-gray-300">—</td>
                                        const isWarn = threshold?.warn !== undefined && fact.value >= threshold.warn
                                        const isLow  = threshold?.min  !== undefined && fact.value < threshold.min
                                        return (
                                          <td key={p.productId} className={`text-center px-2 py-2 font-medium ${isWarn ? 'text-orange-600 bg-orange-50' : isLow ? 'text-blue-500' : 'text-gray-700'}`}>
                                            {fact.value}{fact.unit}
                                            {isWarn && <span className="ml-0.5 text-[9px]">⚠️</span>}
                                          </td>
                                        )
                                      })}
                                      <td className="text-center px-2 py-2 text-gray-400">{rangeLabel}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* ── 營養素合計表 ── */}
                      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-500">
                            各產品營養素合計（{nutritionByProduct.length} 種產品）
                          </p>
                          <p className="text-[10px] text-gray-400">加總估算值</p>
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-3 py-2 font-medium text-gray-500 min-w-[80px]">營養素</th>
                              <th className="text-center px-3 py-2 font-medium text-gray-600 min-w-[60px]">合計</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500 min-w-[100px]">來源產品</th>
                              <th className="text-center px-3 py-2 font-medium text-gray-400 min-w-[70px]">建議範圍</th>
                              <th className="text-center px-3 py-2 font-medium text-gray-400 min-w-[50px]">AI 狀態</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nutrientTotals.map(({ name, totalValue, unit }) => {
                              const threshold = NUTRIENT_THRESHOLDS[name]?.[speciesKey]
                              const isWarn = threshold?.warn !== undefined && totalValue >= threshold.warn
                              const isLow  = threshold?.min  !== undefined && totalValue < threshold.min
                              const rangeLabel = threshold
                                ? [
                                    threshold.min !== undefined ? `≥${threshold.min}%` : '',
                                    threshold.warn !== undefined ? `<${threshold.warn}%` : '',
                                  ].filter(Boolean).join(' ')
                                : '—'
                              const sourceProducts = nutritionByProduct
                                .filter((p) => p.facts.some((f) => f.name === name))
                                .map((p) => p.productName)

                              // AI 狀態（以 nutrient 名稱對應）
                              const aiItem = nutritionAiResult?.items.find((i) => i.nutrient === name)
                              const aiStatus = aiItem?.status

                              // 數值欄顏色：有 AI 結果用 AI 狀態，否則用閾值
                              const valueColor = aiStatus
                                ? ({ danger: 'text-red-600', warning: 'text-orange-600', caution: 'text-yellow-600', safe: 'text-[#1a1a2e]' } as Record<string, string>)[aiStatus]
                                : (isWarn ? 'text-orange-600' : isLow ? 'text-blue-500' : 'text-[#1a1a2e]')
                              const showWarnIcon = aiStatus === 'warning' || aiStatus === 'danger' || (!aiStatus && isWarn)

                              // AI 狀態 badge
                              const aiBadge: Record<string, ReturnType<() => React.JSX.Element>> = {
                                danger:  <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">危險</span>,
                                warning: <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">警示</span>,
                                caution: <span className="inline-block px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium">留意</span>,
                                safe:    <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">正常</span>,
                              }

                              return (
                                <tr key={name} className="border-b border-gray-50 last:border-0">
                                  <td className="px-3 py-2 font-medium text-gray-700">{name}</td>
                                  <td className={`text-center px-3 py-2 font-bold ${valueColor}`}>
                                    {totalValue}{unit}
                                    {showWarnIcon && <span className="ml-0.5">⚠️</span>}
                                  </td>
                                  <td className="px-3 py-2 text-gray-500">
                                    {sourceProducts.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {sourceProducts.map((pName) => (
                                          <span key={pName} className="inline-block bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 text-[10px] leading-tight max-w-[120px] truncate" title={pName}>
                                            {pName}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                  <td className="text-center px-3 py-2 text-gray-400 text-[11px]">{rangeLabel}</td>
                                  <td className="text-center px-3 py-2">
                                    {aiStatus ? aiBadge[aiStatus] : <span className="text-gray-300 text-[10px]">—</span>}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        </div>
                        <p className="text-[10px] text-gray-400 px-3 pb-2 pt-1">
                          * 無 AAFCO 對照標準的營養素僅顯示合計值，可透過 AI 分析獲得建議
                        </p>
                      </div>

                      {/* ── AI 深度分析 ── */}

                      {/* 載入儲存中的結果 */}
                      {nutritionAiSavedLoading && (
                        <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
                          <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                          載入上次分析紀錄…
                        </div>
                      )}

                      {/* 初次分析按鈕（無已存結果且未在分析中） */}
                      {!nutritionAiResult && !nutritionAiLoading && !nutritionAiSavedLoading && (
                        <button
                          onClick={() => runNutritionAi(nutrientTotals, nutritionByProduct.length)}
                          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#4F7CFF] to-[#6B8FFF] text-white rounded-2xl font-medium text-sm shadow-sm active:opacity-90 transition-opacity"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                            <path d="M12 6v6l4 2"/>
                          </svg>
                          AI 深度分析營養安全性
                        </button>
                      )}

                      {nutritionAiLoading && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center space-y-2">
                          <div className="w-8 h-8 border-2 border-[#4F7CFF] border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-sm font-medium text-[#1a1a2e]">AI 正在分析營養安全性…</p>
                          <p className="text-xs text-gray-400">根據寵物體型、物種與 AAFCO 標準進行評估</p>
                        </div>
                      )}

                      {nutritionAiError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                          {nutritionAiError}
                          <button
                            onClick={() => runNutritionAi(nutrientTotals, nutritionByProduct.length)}
                            className="block mt-1 text-xs text-[#4F7CFF] font-medium"
                          >
                            重試
                          </button>
                        </div>
                      )}

                      {nutritionAiResult && (() => {
                        const hasRisk = nutritionAiResult.items.some((i) => i.status === 'warning' || i.status === 'danger')
                        const savedDate = nutritionAiResult.savedAt
                          ? new Date(nutritionAiResult.savedAt).toLocaleString('zh-TW', {
                              month: 'numeric', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : null
                        return (
                          <div className="space-y-3">
                            {/* Overall assessment */}
                            <div className={`rounded-2xl border p-4 ${hasRisk ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{hasRisk ? '⚠️' : '✅'}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-[#1a1a2e]">AI 整體評估</p>
                                  {savedDate && (
                                    <p className="text-[10px] text-gray-400">上次分析：{savedDate}</p>
                                  )}
                                </div>
                                {!nutritionAiLoading && (
                                  <button
                                    onClick={() => runNutritionAi(nutrientTotals, nutritionByProduct.length)}
                                    className="shrink-0 flex items-center gap-1 text-xs text-[#4F7CFF] font-medium bg-white/70 px-2 py-1 rounded-lg border border-[#4F7CFF]/30 active:opacity-70"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                                      <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                    </svg>
                                    重新分析
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{nutritionAiResult.overall}</p>
                            </div>

                            {/* Per-nutrient items — summary + expandable details */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500">各營養素分析</p>
                              {nutritionAiResult.items.map((item, i) => {
                                const cfg = NUTRITION_STATUS_CONFIG[item.status] || NUTRITION_STATUS_CONFIG.safe
                                const isRisk = item.status === 'warning' || item.status === 'danger'
                                return (
                                  <NutrientCard key={i} item={item} cfg={cfg} isRisk={isRisk} />
                                )
                              })}
                            </div>

                            {/* General recommendations */}
                            {nutritionAiResult.generalRecommendations.length > 0 && (
                              <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-1.5">
                                <p className="text-xs font-semibold text-gray-600">整體建議</p>
                                {nutritionAiResult.generalRecommendations.map((rec, i) => (
                                  <p key={i} className="text-xs text-gray-600 flex gap-1.5">
                                    <span className="text-[#4F7CFF] shrink-0">•</span>
                                    <span>{rec}</span>
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Reference source */}
                            <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-[10px] text-gray-400 leading-relaxed">
                              <span className="font-medium text-gray-500">資料參考來源：</span>
                              世界動物衛生組織、世界獸醫協會、WSAVA、CAPC、OFA、APOP、NRC、AAFCO（美國飼料管理協會）、FEDIAF、PNA、AAVN、Waltham Petcare Science Institute、農業部動植物防疫檢疫署、農業部食品藥物管理署、農業部、中華民國獸醫師公會全國聯合會、台灣小動物獸醫學會、台灣獸醫內科醫學會、台灣獸醫外科醫學會、國立臺灣大學獸醫專業學院、國立中興大學獸醫學系
                            </div>
                          </div>
                        )
                      })()}

                      {/* 警示說明 */}
                      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                        <p className="font-medium text-gray-600">說明</p>
                        <p>• 合計值為各產品標示值直接加總，代表最高負荷上限估算</p>
                        <p>• <span className="text-orange-600 font-medium">橘色/偏高</span>：超過 AAFCO 建議上限</p>
                        <p>• <span className="text-blue-500 font-medium">藍色/偏低</span>：低於 AAFCO 最低需求</p>
                        <p>• AI 分析結合寵物體型與物種，提供個人化建議，僅供參考</p>
                        <p className="text-gray-400 pt-0.5">※ AAFCO = 美國飼料管理協會（Association of American Feed Control Officials）</p>
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

            {/* Tab: Supplements */}
            {activeTab === 'supplements' && (
              <div className="space-y-2">
                {result.supplements.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2">🎉</p>
                    <p className="text-sm font-medium text-gray-700">目前飲食均衡，無明顯缺乏</p>
                    <p className="text-xs text-gray-400 mt-1">
                      記錄更多症狀可獲得針對性的補充建議
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">
                      根據 {currentPet.name} 的症狀記錄，建議補充以下營養：
                    </p>
                    {result.supplements.map((s, i) => {
                      const cfg = PRIORITY_CONFIG[s.priority]
                      return (
                        <div key={i} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                            <p className="font-semibold text-sm text-[#1a1a2e]">{s.name}</p>
                            <span className="ml-auto text-xs text-gray-500 font-medium">{cfg.label}</span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed mb-1.5">{s.reason}</p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">建議來源：</span>{s.examples}
                          </p>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}

            {/* Bottom hint */}
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-600">如何獲得更完整的分析？</p>
              <p>• 在「日誌」中記錄所有正在使用的食品/用品</p>
              <p>• 用「上傳」功能拍攝成分表，讓 AI 自動萃取成分</p>
              <p>• 在「症狀」頁記錄症狀，獲得針對性補充建議</p>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && !error && !result && !currentPetId && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">請先建立寵物檔案</p>
            <Link href="/pet/new" className="inline-block mt-2 text-[#4F7CFF] text-sm font-medium">
              → 建立寵物檔案
            </Link>
          </div>
        )}
      </div>

      {/* Product edit modal */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null)
            runAnalysis(currentPetId)
          }}
        />
      )}
    </div>
  )
}
