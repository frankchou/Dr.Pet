'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { WebProductDetailed } from '@/app/api/products/web-search/route'

// 飲食頁「添加項目」bottom-sheet modal：AI 搜尋產品 → 選取後存標準化品項。
// 設計圖：diet-add-item-ai-search.jpg（搜尋 + 卡片收合）、diet-add-item-detail-info-1/2.jpg（展開細節）、
// diet-add-item-ai-search-risk-1/2.jpg（兩種風險樣式）。

// ─── 型別 ────────────────────────────────────────────────────────────────────

interface AddedItem {
  id: string
  planId: string
  session: string
  productId?: string | null
  product?: { id: string; type: string; name: string; brand?: string | null } | null
  customName?: string | null
  quantity: number
  unit: string
  estimatedGrams?: number | null
  tags: string
  sortOrder: number
  createdAt: string
}

interface Props {
  planId: string
  session: 'morning' | 'noon' | 'evening'
  petId: string | null
  // 已加入此計畫的產品名稱集合（顯示「已加入」徽章）
  addedNames: Set<string>
  onAdded: (item: AddedItem) => void
  onClose: () => void
}

// 卡片只顯示 AI 真實回傳的 detail（缺漏欄位 = null / 空陣列 → 隱藏該欄位，不造假補值）。
type DisplayProduct = WebProductDetailed

// 分類 chips → 送給 AI 的偏好提示，以及 type → tags 對應
interface CategoryDef {
  key: string
  label: string
}

const CATEGORIES: CategoryDef[] = [
  { key: 'all', label: '全部商品' },
  { key: 'feed', label: '飼料' },
  { key: 'supplement', label: '保健品' },
  { key: 'fresh', label: '鮮食' },
  { key: 'snack', label: '零食' },
]

// type → 中文分類標籤（卡片左上）
const TYPE_LABEL: Record<string, string> = {
  feed: '飼料',
  wet: '濕食罐頭',
  snack: '零食',
  supplement: '保健品',
  dental: '牙齒保健',
  shampoo: '洗護',
  other: '其他',
}

// type → 存入品項時的標籤（與既有 TAG_OPTIONS 對齊）
const TYPE_TO_TAG: Record<string, string> = {
  feed: '狗飼料',
  wet: '鮮食',
  snack: '零食',
  supplement: '保健品',
  other: '鮮食',
}

const SEARCH_DEBOUNCE_MS = 600

// ─── SVG icons ───────────────────────────────────────────────────────────────

const SearchIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const MicIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
  </svg>
)

const PlusCircle = ({ size = 26, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="6" x2="12" y2="18" /><line x1="6" y1="12" x2="18" y2="12" />
  </svg>
)

const XIcon = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const ChevronDown = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const DocIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const CheckBadge = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const ClockIcon = ({ size = 13, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

const AlertIcon = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const Spinner = ({ className = '' }: { className?: string }) => (
  <div className={cn('w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin', className)} />
)

// ─── 成分展開細節（detail-info-1/2 圖）────────────────────────────────────────
// 方案 B：只顯示 AI 真實回傳（detail）有值的欄位；缺漏（null / 空陣列）→ 整段隱藏，不造假。

function DetailSections({ detail }: { detail: WebProductDetailed['detail'] }) {
  // AI 只回基本資料時，展開區可能完全沒有可顯示內容 → 顯示「無資料」而非空白破版。
  const hasAnyDetail =
    !!detail.fullIngredients ||
    !!detail.nutritionalAdditives ||
    detail.nutritionFacts.length > 0 ||
    detail.spec.length > 0 ||
    detail.manufacturing.length > 0 ||
    detail.feedingGuide.length > 0

  return (
    <div className="space-y-5 pt-2">
      {!hasAnyDetail && (
        <p className="text-xs text-slate-400 leading-relaxed">
          AI 尚未取得此產品的詳細成分資料，請以實際包裝為準。
        </p>
      )}

      {/* 完整成分 */}
      {detail.fullIngredients && (
        <section>
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
            <DocIcon size={15} className="text-slate-400" /> 完整成分資訊
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">{detail.fullIngredients}</p>
        </section>
      )}

      {/* 營養添加物 */}
      {detail.nutritionalAdditives && (
        <section>
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5">
            營養添加物（每公斤）
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">{detail.nutritionalAdditives}</p>
        </section>
      )}

      {/* 營養成分表 */}
      {detail.nutritionFacts.length > 0 && (
        <section>
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2">
            營養成分表
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {detail.nutritionFacts.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                <span className="text-slate-500">{row.label}</span>
                <span className="font-bold text-slate-700">{row.value}</span>
              </div>
            ))}
          </div>
          {detail.caloriePerKg && (
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#C4714A] mt-2">
              熱量：{detail.caloriePerKg}
            </p>
          )}
        </section>
      )}

      {/* 商品規格 */}
      {detail.spec.length > 0 && (
        <section>
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2">
            商品規格
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {detail.spec.map((row, i) => (
              <p key={i} className="text-xs">
                <span className="text-slate-500">{row.label}：</span>
                <span className="font-bold text-slate-700">{row.value}</span>
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 製造與代理資訊 */}
      {detail.manufacturing.length > 0 && (
        <section>
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2">
            製造與代理資訊
          </p>
          <div className="space-y-1">
            {detail.manufacturing.map((row, i) => (
              <p key={i} className="text-xs">
                <span className="text-slate-500">{row.label}：</span>
                <span className="font-medium text-slate-700">{row.value}</span>
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 每日建議餵食量 */}
      {detail.feedingGuide.length > 0 && (
        <section>
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2">
            每日建議餵食量
          </p>
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-2 bg-slate-50 text-[11px] font-bold text-slate-500 px-3 py-2">
              <span>體重 (kg)</span><span>每日餵食 (g)</span>
            </div>
            {detail.feedingGuide.map((row, i) => (
              <div key={i} className="grid grid-cols-2 text-xs text-slate-700 px-3 py-2 border-t border-slate-100">
                <span>{row.weight}</span><span>{row.amount}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 錯誤回報 */}
      <button
        type="button"
        onClick={() => alert('已收到錯誤回報，我們會盡快核對此產品資料。')}
        className="flex items-center gap-1.5 border border-slate-200 text-slate-500 text-xs font-bold px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
      >
        <AlertIcon size={13} /> 錯誤回報
      </button>
    </div>
  )
}

// ─── 單一產品卡片 ─────────────────────────────────────────────────────────────

interface CardProps {
  product: DisplayProduct
  isAdded: boolean
  adding: boolean
  onAdd: () => void
}

function ProductCard({ product, isAdded, adding, onAdd }: CardProps) {
  const [expanded, setExpanded] = useState(false)

  const detail = product.detail
  const typeLabel = TYPE_LABEL[product.type] ?? '其他'
  const risk = product.risk
  const isBrandWarning = risk.style === 'brand'
  const isProductRisk = risk.style === 'product'

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        isProductRisk ? 'border-red-100 bg-red-50/30' : 'border-slate-100 bg-white',
      )}
    >
      {/* 分類標籤列 + 已加入 + 加入鈕 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 bg-[#FEF1E2] text-[#C4714A] text-[10px] font-bold rounded-md shrink-0">
            {typeLabel}
          </span>
          {/* 風險樣式 A：分類旁紅色「建議謹慎使用」chip */}
          {isProductRisk && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-md shrink-0">
              <AlertIcon size={11} /> 建議謹慎使用
            </span>
          )}
          {isAdded && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md shrink-0">
              已加入
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={adding || isAdded}
          className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors',
            isAdded
              ? 'bg-slate-100 text-slate-300'
              : 'bg-[#FEF1E2] text-[#C4714A] hover:bg-[#FDDFC8]',
          )}
          aria-label="加入此產品"
        >
          {adding ? <Spinner className="text-[#C4714A] w-5 h-5" /> : <PlusCircle size={24} />}
        </button>
      </div>

      {/* 風險樣式 B：產品名上方紅色品牌警示橫幅 */}
      {isBrandWarning && (
        <div className="flex items-center gap-1.5 mt-2.5 text-red-600">
          <AlertIcon size={14} />
          <span className="text-xs font-bold">
            {product.brand}（品牌警示{risk.brandWarningText ? `：${risk.brandWarningText}` : ''}）
          </span>
        </div>
      )}

      {/* 產品名 + 品牌規格 */}
      <h3 className="font-black text-slate-900 text-lg leading-snug mt-1.5">{product.name}</h3>
      <p className="flex items-center gap-1.5 text-sm text-slate-400 font-medium mt-0.5">
        <span>
          {product.brand && !isBrandWarning ? `品牌：${product.brand}｜` : ''}
          規格：{detail.variant ?? '無資料'}
        </span>
      </p>

      {/* 完整成分資訊（可展開）*/}
      <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between"
        >
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
            <DocIcon size={16} className="text-slate-400" />
            完整成分資訊（與包裝一致）
          </span>
          <ChevronDown size={18} className={cn('text-slate-400 transition-transform', expanded && 'rotate-180')} />
        </button>

        {!expanded ? (
          <>
            <p className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed mt-2.5">
              <span>{detail.ingredientSummary ?? '點擊展開檢視完整成分資訊。'}</span>
            </p>
            {detail.certifications.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {detail.certifications.map(cert => (
                  <span key={cert} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[11px] font-bold rounded-lg">
                    <CheckBadge size={13} className="text-emerald-500" /> {cert}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <DetailSections detail={detail} />
        )}
      </div>

      {/* 風險樣式 A：紅色「風險說明」段 */}
      {isProductRisk && risk.productRiskText && (
        <div className="mt-3 rounded-2xl bg-red-50 border border-red-100 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-red-600 mb-1.5">
            <AlertIcon size={15} /> 風險說明：
          </p>
          <p className="text-xs text-red-700/90 leading-relaxed">{risk.productRiskText}</p>
        </div>
      )}

      {/* AI 驗證數據出處 + 更新日期 */}
      {(detail.dataSources.length > 0 || detail.dataUpdatedAt) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          {detail.dataSources.length > 0 && (
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                AI 驗證數據出處：
              </p>
              <p className="text-xs font-bold text-[#C4714A] truncate">
                {detail.dataSources.join('　')}
              </p>
            </div>
          )}
          {detail.dataUpdatedAt && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-400 text-[11px] font-bold rounded-lg shrink-0">
              <ClockIcon size={12} /> 數據更新：{detail.dataUpdatedAt}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 主元件 ───────────────────────────────────────────────────────────────────

export default function AddItemModal({ planId, session, petId, addedNames, onAdded, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DisplayProduct[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [addingName, setAddingName] = useState<string | null>(null)
  // 自訂備援
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [savingCustom, setSavingCustom] = useState(false)

  const reqIdRef = useRef(0)

  const runSearch = useCallback(async (q: string, cat: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults([])
      setSearched(false)
      return
    }
    const reqId = ++reqIdRef.current
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/products/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, petId, detailed: true, category: cat }),
      })
      const data = await res.json() as { products?: WebProductDetailed[]; error?: string }
      // 競態保護：只接受最後一次請求的結果
      if (reqId !== reqIdRef.current) return
      if (!res.ok) throw new Error(data.error ?? '搜尋失敗')
      // 方案 B：直接用 AI 真實回傳的 detail，不補任何示意值；缺漏欄位由卡片隱藏。
      setResults(data.products ?? [])
      setSearched(true)
    } catch (e) {
      if (reqId !== reqIdRef.current) return
      setError(e instanceof Error ? e.message : '搜尋失敗，請重試')
      setResults([])
      setSearched(true)
    } finally {
      if (reqId === reqIdRef.current) setLoading(false)
    }
  }, [petId])

  // debounce：打字停 600ms 後觸發搜尋
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    const t = setTimeout(() => void runSearch(query, category), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query, category, runSearch])

  // 加入標準化產品：先建立 / 取得 PetProduct（綁定 productId），再寫入 mealPlanItem
  const handleAdd = async (product: DisplayProduct) => {
    if (!planId) return
    setAddingName(product.name)
    setError('')
    try {
      // 1. 標準化產品：建立 Product（綁 productId），讓營養/成分分析能對應真實產品。
      //    detail 即 AI 真實回傳（缺漏欄位為 null / 空陣列），缺漏就留空/不存，不寫任何示意值。
      const raw = product.detail
      // ingredientJson 只放真實有值的欄位，空陣列 / 空字串不落地
      const ingredientJson: Record<string, unknown> = {}
      if (product.ingredients.length > 0) ingredientJson.ingredients = product.ingredients
      if (raw.certifications.length > 0) ingredientJson.certifications = raw.certifications
      if (raw.nutritionFacts.length > 0) ingredientJson.nutritionFacts = raw.nutritionFacts
      if (raw.dataSources.length > 0) ingredientJson.dataSources = raw.dataSources

      let productId: string | null = null
      try {
        const pres = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: product.type || 'other',
            name: product.name,
            brand: product.brand || null,
            variant: raw.variant ?? null,
            ingredientText: raw.fullIngredients ?? raw.ingredientSummary ?? null,
            ingredientJson,
          }),
        })
        if (pres.ok) {
          const created = await pres.json() as { id?: string }
          productId = created.id ?? null
        }
      } catch {
        // 標準化失敗則降級為 customName，仍可加入品項
      }

      // 1b. 同時加入該毛孩試用清單（綁 PetProduct），讓產品管理頁也看得到
      if (productId && petId) {
        try {
          await fetch('/api/pet-products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ petId, productId, listType: 'trial' }),
          })
        } catch {
          // 非關鍵，靜默降級
        }
      }

      // 2. 寫入配餐品項
      const tag = TYPE_TO_TAG[product.type] ?? '鮮食'
      const res = await fetch(`/api/meal-plans/${planId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          productId,
          customName: productId ? null : product.name,
          quantity: 1,
          unit: '份',
          tags: [tag],
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? '加入失敗')
      }
      const item = await res.json() as AddedItem
      onAdded(item)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入失敗，請重試')
    } finally {
      setAddingName(null)
    }
  }

  // 自訂備援：找不到產品時手動加入
  const handleCustomAdd = async () => {
    if (!customName.trim() || !planId) return
    setSavingCustom(true)
    setError('')
    try {
      const res = await fetch(`/api/meal-plans/${planId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          customName: customName.trim(),
          quantity: 1,
          unit: '份',
          tags: [],
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? '加入失敗')
      }
      const item = await res.json() as AddedItem
      onAdded(item)
      setCustomName('')
      setShowCustom(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入失敗，請重試')
    } finally {
      setSavingCustom(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl max-h-[90dvh] flex flex-col w-full max-w-[480px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <span className="font-bold text-lg text-[#2C1810]">添加配餐項目</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="關閉"
          >
            <XIcon />
          </button>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-4"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          {/* 搜尋框 */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C4714A]">
              <SearchIcon size={20} />
            </span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜尋產品名稱 / 品牌…"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-3.5 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#FDDFC8] transition-all placeholder:text-slate-400 placeholder:font-medium"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
              <MicIcon size={20} />
            </span>
          </div>

          {/* 分類 chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-bold transition-colors',
                  category === cat.key
                    ? 'bg-[#C4714A] text-white'
                    : 'bg-[#FAF4ED] text-slate-400 hover:text-[#C4714A]',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 結果標題 */}
          {(searched || loading) && (
            <p className="text-sm font-bold text-slate-400 mt-6 mb-3">
              AI 智能搜尋結果 {!loading && `(${results.length})`}
            </p>
          )}

          {/* loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner className="text-[#C4714A]" />
              <p className="text-xs text-slate-400 font-medium">AI 搜尋產品與成分資料中…</p>
            </div>
          )}

          {/* 錯誤 */}
          {error && !loading && (
            <p className="text-xs font-bold text-red-500 text-center py-2">{error}</p>
          )}

          {/* 結果卡片 */}
          {!loading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((p, i) => (
                <ProductCard
                  key={`${p.name}-${i}`}
                  product={p}
                  isAdded={addedNames.has(p.name)}
                  adding={addingName === p.name}
                  onAdd={() => void handleAdd(p)}
                />
              ))}
            </div>
          )}

          {/* 空結果 */}
          {!loading && searched && results.length === 0 && !error && (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 font-medium">找不到符合的產品</p>
            </div>
          )}

          {/* 找不到可自訂備援 */}
          {(searched || query.trim()) && !loading && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              {!showCustom ? (
                <button
                  onClick={() => { setShowCustom(true); setCustomName(query.trim()) }}
                  className="w-full py-3 border border-dashed border-slate-300 rounded-2xl text-sm font-bold text-slate-500 hover:border-[#C4714A] hover:text-[#C4714A] transition-colors"
                >
                  找不到？手動自訂新增
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700">手動自訂新增</p>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="輸入商品名稱"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleCustomAdd()}
                      disabled={savingCustom || !customName.trim()}
                      className={cn(
                        'flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors',
                        savingCustom || !customName.trim()
                          ? 'bg-slate-200 text-slate-400'
                          : 'bg-[#111111] text-white hover:bg-black',
                      )}
                    >
                      {savingCustom ? <Spinner className="text-slate-400" /> : '加入'}
                    </button>
                    <button
                      onClick={() => setShowCustom(false)}
                      className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 尚未搜尋的提示 */}
          {!searched && !loading && !query.trim() && (
            <div className="text-center py-12">
              <p className="text-sm text-slate-400 font-medium">輸入產品名稱，AI 會為您搜尋並核對成分</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
