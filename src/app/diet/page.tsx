'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn, parseJson, formatDate } from '@/lib/utils'
import type { DietAnalysisResult } from '@/app/api/diet-analysis/route'

// ─── 型別 ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  type: string
  name: string
  brand?: string | null
}

interface MealPlanItem {
  id: string
  planId: string
  session: string
  productId?: string | null
  product?: Product | null
  customName?: string | null
  quantity: number
  unit: string
  estimatedGrams?: number | null
  tags: string // JSON string
  sortOrder: number
  createdAt: string
}

interface MealPlan {
  id: string
  petId: string
  date: string
  items: MealPlanItem[]
}

type Session = 'morning' | 'noon' | 'evening'

// instant-analyze 回傳結構（部分欄位）
interface InstantAnalyzeResult {
  verdict: 'safe' | 'caution' | 'danger'
  suitabilityScore?: number
  productName?: string
  summary: string
  extractedIngredients?: string[]
  concerns?: { ingredient: string; reason: string }[]
  positives?: { ingredient: string; reason: string }[]
}

// rule-based 成分分析回傳結構（/api/analysis GET）
interface IngredientAnalysisItem {
  name: string
  category: string   // 'toxic' | 'warning' | 'caution' | 'safe'
  reason?: string
}

interface IngredientAnalysisResult {
  result?: {
    flagged?: IngredientAnalysisItem[]
  }
}

// 分析 Tab 類型
type AnalysisTab = 'swap' | 'photo' | 'store' | 'ingredient'

// ─── 常數 ────────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = ['平匙', '克', '朵', '錠', '份'] as const

const TAG_OPTIONS = ['狗飼料', '貓飼料', '保健品', '鮮食', '零食'] as const

const SESSION_META: Record<Session, { label: string; en: string; icon: React.ReactNode; bg: string }> = {
  morning: {
    label: '晨間',
    en: 'MORNING PLAN',
    bg: '#FEF9EC',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  noon: {
    label: '午間',
    en: 'NOON PLAN',
    bg: '#FEF9EC',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  evening: {
    label: '晚間',
    en: 'NIGHT PLAN',
    bg: '#EDF3FB',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
}

const SESSIONS: Session[] = ['morning', 'noon', 'evening']

const DETAIL_REPORT_ITEMS: Array<{ key: keyof DietAnalysisResult['detailedReport']; title: string }> = [
  { key: 'nutritionStandard', title: '① 國際營養基準比對' },
  { key: 'hydration', title: '② 水分攝取預估' },
  { key: 'dietaryRestrictions', title: '③ 專屬飲食限制' },
  { key: 'ingredientScience', title: '④ 成分學理標註' },
  { key: 'foodSafetyAlert', title: '⑤ 官方食安通報' },
  { key: 'drugFoodInteraction', title: '⑥ 潛在藥食關聯' },
  { key: 'calorieCalculation', title: '⑦ 動態熱量試算' },
  { key: 'foodTransition', title: '⑧ 換食過渡推估' },
  { key: 'logCorrelation', title: '⑨ 日誌時序比對' },
]

const HOT_SEARCH_CHIPS = ['鱈魚原肉配方', '深海起司罐身', '去皮鮮嫩乾糧']

// ─── SVG icons ───────────────────────────────────────────────────────────────

const ChevronDown = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const ChevronUp = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
)

const Plus = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const XIcon = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const Spinner = ({ className = '' }: { className?: string }) => (
  <div className={cn('w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin', className)} />
)

// ─── 新增表單 ─────────────────────────────────────────────────────────────────

interface AddItemFormProps {
  planId: string
  session: Session
  onAdded: (item: MealPlanItem) => void
  onCancel: () => void
}

function AddItemForm({ planId, session, onAdded, onCancel }: AddItemFormProps) {
  const [customName, setCustomName] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [unit, setUnit] = useState<string>('份')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    if (!customName.trim()) {
      setError('請輸入商品名稱')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/meal-plans/${planId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          customName: customName.trim(),
          quantity,
          unit,
          tags: selectedTags,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? '新增失敗')
      }
      const item = await res.json() as MealPlanItem
      onAdded(item)
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
      <div className="space-y-3">
        {/* 商品名稱 */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">商品名稱</label>
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="例：皇家低敏飼料"
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* 數量 + 單位 */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">數量</label>
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={quantity}
              onChange={e => setQuantity(parseFloat(e.target.value) || 1)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">單位</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
            >
              {UNIT_OPTIONS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 標籤 */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">標籤（可多選）</label>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map(tag => {
              const checked = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                    checked
                      ? 'bg-[#C4714A] text-white border-[#C4714A]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#C4714A] hover:text-[#C4714A]',
                  )}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-xs font-bold text-red-500">{error}</p>}

        {/* 操作按鈕 */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2',
              saving ? 'bg-slate-200 text-slate-400' : 'bg-[#111111] text-white hover:bg-black',
            )}
          >
            {saving ? <Spinner className="text-slate-400" /> : '確認新增'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 時段 Accordion ───────────────────────────────────────────────────────────

interface SessionAccordionProps {
  session: Session
  items: MealPlanItem[]
  isOpen: boolean
  onToggle: () => void
  planId: string | null
  onItemAdded: (item: MealPlanItem) => void
  onItemDeleted: (itemId: string) => void
}

function SessionAccordion({
  session,
  items,
  isOpen,
  onToggle,
  planId,
  onItemAdded,
  onItemDeleted,
}: SessionAccordionProps) {
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const meta = SESSION_META[session]

  const handleDelete = async (itemId: string) => {
    if (!planId) return
    setDeletingId(itemId)
    try {
      await fetch(`/api/meal-plans/${planId}/items?itemId=${itemId}`, { method: 'DELETE' })
      onItemDeleted(itemId)
    } catch {
      // 靜默降級
    } finally {
      setDeletingId(null)
    }
  }

  const handleItemAdded = (item: MealPlanItem) => {
    onItemAdded(item)
    setShowForm(false)
  }

  // 收起狀態的摘要：前 3 個品項
  const summaryItems = items.slice(0, 3)

  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-sm border transition-all',
        isOpen ? 'border-slate-200' : 'border-slate-100',
      )}
    >
      {/* Header — 點擊切換展開 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: meta.bg }}
          >
            <span className={cn(session === 'evening' ? 'text-[#7C9CE3]' : 'text-[#D98A53]')}>
              {meta.icon}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{meta.label}</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">{meta.en}</span>
            </div>
            {!isOpen && (
              <div className="mt-0.5 min-w-0">
                {summaryItems.length > 0 ? (
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {summaryItems.map(it => {
                      const name = it.product?.name ?? it.customName ?? ''
                      return `${name} ${it.quantity}${it.unit}`
                    }).join('、')}
                    {items.length > 3 && ` 等${items.length}項`}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">尚未添加配餐項目</p>
                )}
              </div>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-400 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-slate-400 shrink-0" />
        )}
      </button>

      {/* 展開內容 */}
      {isOpen && (
        <div className="px-4 pb-4">
          {/* 品項列表 */}
          {items.length > 0 ? (
            <div className="space-y-2 mb-3">
              {items.map(item => {
                const name = item.product?.name ?? item.customName ?? '未命名'
                const tags = parseJson<string[]>(item.tags, [])
                return (
                  <div
                    key={item.id}
                    className="bg-slate-50 rounded-xl p-3 flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{name}</span>
                        <span className="text-sm text-slate-500 font-medium shrink-0">
                          {item.quantity}{item.unit}
                        </span>
                      </div>
                      {item.estimatedGrams != null && (
                        <p className="text-xs text-slate-400 mt-0.5">約 {item.estimatedGrams} 克</p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-[#FEF1E2] text-[#C4714A] text-[10px] font-bold rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-400 hover:border-red-200 transition-colors shrink-0 disabled:opacity-40"
                      aria-label="刪除此項目"
                    >
                      {deletingId === item.id ? (
                        <Spinner className="text-slate-300 w-3 h-3 border" />
                      ) : (
                        <XIcon size={12} />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-3 text-center">
              <p className="text-sm text-slate-400">尚未添加配餐項目</p>
            </div>
          )}

          {/* 新增表單或新增按鈕 */}
          {showForm && planId ? (
            <AddItemForm
              planId={planId}
              session={session}
              onAdded={handleItemAdded}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:border-[#C4714A] hover:text-[#C4714A] transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              繼續添加項目
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 進度條 ───────────────────────────────────────────────────────────────────

interface NutrientBarProps {
  label: string
  value: number
  max: number
  color: string
  unit?: string
}

function NutrientBar({ label, value, max, color, unit = '%' }: NutrientBarProps) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-slate-600 w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">
        {value}{unit}
      </span>
    </div>
  )
}

// ─── 詳細報告 Modal ───────────────────────────────────────────────────────────

interface DetailedReportModalProps {
  report: DietAnalysisResult['detailedReport']
  onClose: () => void
}

function DetailedReportModal({ report, onClose }: DetailedReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-[480px] max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal 標題 */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-lg text-[#2C1810]">全域綜合飲食分析報告</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              aria-label="關閉"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>

        {/* 捲動內容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 系統分析基礎宣告 */}
          <div className="bg-[#1C1C1E] text-white rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-400 mb-1">系統分析基礎宣告</p>
            <p className="text-xs leading-relaxed text-slate-200">
              本報告依據 AAFCO、FEDIAF、NRC 及 WSAVA 寵物營養準則，結合世界獸醫協會建議，對今日配餐進行多維度評估。所有數值為估算值，僅供參考，不取代獸醫師專業診斷。
            </p>
          </div>

          {/* 9 大分項 */}
          {DETAIL_REPORT_ITEMS.map(({ key, title }) => (
            <div key={key} className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-black text-[#C4714A] mb-2">{title}</p>
              <p className="text-sm leading-relaxed text-slate-700">{report[key]}</p>
            </div>
          ))}
        </div>

        {/* 底部按鈕 */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#111111] text-white font-bold rounded-2xl text-sm"
          >
            確認並關閉
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AI 分析結果區塊 ──────────────────────────────────────────────────────────

interface AiAnalysisResultProps {
  result: DietAnalysisResult
  petId: string | null
}

function AiAnalysisResult({ result, petId }: AiAnalysisResultProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('swap')
  const [showModal, setShowModal] = useState(false)

  // Tab 2：自拍成分
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false)
  const [photoResult, setPhotoResult] = useState<InstantAnalyzeResult | null>(null)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tab 4：輸入成分
  const [ingredientInput, setIngredientInput] = useState('')
  const [ingredientQuerying, setIngredientQuerying] = useState(false)
  const [ingredientResult, setIngredientResult] = useState<IngredientAnalysisResult | null>(null)
  const [ingredientError, setIngredientError] = useState('')

  const sessionLabel = (session: string): string => {
    const map: Record<string, string> = { morning: '晨間', noon: '午間', evening: '晚間' }
    return map[session] ?? session
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoResult(null)
      setPhotoError('')
    }
  }

  const handlePhotoAnalyze = async () => {
    if (!photoFile || !petId) return
    setPhotoAnalyzing(true)
    setPhotoError('')
    try {
      const formData = new FormData()
      formData.append('file', photoFile)
      formData.append('petId', petId)
      const res = await fetch('/api/instant-analyze', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? '分析失敗')
      }
      const data = await res.json() as InstantAnalyzeResult
      setPhotoResult(data)
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : '分析失敗，請重試')
    } finally {
      setPhotoAnalyzing(false)
    }
  }

  const handleIngredientQuery = async (query?: string) => {
    const target = (query ?? ingredientInput).trim()
    if (!target || !petId) return
    if (query) setIngredientInput(query)
    setIngredientQuerying(true)
    setIngredientError('')
    setIngredientResult(null)
    try {
      const res = await fetch(`/api/analysis?ingredient=${encodeURIComponent(target)}&petId=${petId}`)
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? '查詢失敗')
      }
      const data = await res.json() as IngredientAnalysisResult
      setIngredientResult(data)
    } catch (e) {
      setIngredientError(e instanceof Error ? e.message : '查詢失敗，請重試')
    } finally {
      setIngredientQuerying(false)
    }
  }

  const verdictColor = (v: string): string => {
    if (v === 'safe') return 'text-green-600 bg-green-50'
    if (v === 'danger') return 'text-red-600 bg-red-50'
    return 'text-amber-600 bg-amber-50'
  }

  const verdictLabel = (v: string): string => {
    if (v === 'safe') return '適合'
    if (v === 'danger') return '不建議'
    return '需謹慎'
  }

  const categoryColor = (category: string): string => {
    if (category === 'toxic') return 'text-red-600 bg-red-50'
    if (category === 'warning') return 'text-orange-600 bg-orange-50'
    if (category === 'caution') return 'text-amber-600 bg-amber-50'
    return 'text-green-600 bg-green-50'
  }

  const categoryLabel = (category: string): string => {
    if (category === 'toxic') return '有毒'
    if (category === 'warning') return '警告'
    if (category === 'caution') return '注意'
    return '安全'
  }

  const TABS: Array<{ key: AnalysisTab; label: string }> = [
    { key: 'swap', label: '商品換掉' },
    { key: 'photo', label: '自拍成分' },
    { key: 'store', label: '實體通路' },
    { key: 'ingredient', label: '輸入成分' },
  ]

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mt-4">
        {/* 標題列 + 評分 */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">AI 智能配餐重點分析</p>
            <h3 className="font-black text-slate-900 text-base">今日配餐評估</h3>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-[#C4714A] leading-none">{result.score}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">綜合適配度</p>
          </div>
        </div>

        {/* 核心指標 */}
        <div className="space-y-2.5 mb-4">
          <NutrientBar label="蛋白" value={result.protein} max={60} color="#C4714A" />
          <NutrientBar label="脂肪" value={result.fat} max={40} color="#F59E0B" />
          <NutrientBar label={`鈣磷比 ${result.calciumPhosphorus}`} value={parseFloat(result.calciumPhosphorus)} max={2.5} color="#475569" unit="" />
          <NutrientBar label="水分" value={result.moisture} max={100} color="#60A5FA" />
        </div>

        {/* 關鍵警示 */}
        {result.alerts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {result.alerts.map((alert, i) => (
              <span
                key={i}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-bold',
                  alert.type === 'danger'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-orange-50 text-orange-600',
                )}
              >
                {alert.type === 'danger' ? '↑' : '!'} {alert.message}
              </span>
            ))}
          </div>
        )}

        {/* AI 專家點評 */}
        <div className="bg-[#FAF7F2] rounded-2xl p-4 mb-4">
          <p className="text-[10px] font-black text-[#C4714A] tracking-wider mb-1.5">AI 專家點評</p>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">"{result.expertComment}"</p>
        </div>

        {/* 腎病飲食調配 4 Tab */}
        <div className="mb-4">
          <p className="text-xs font-black text-slate-500 tracking-wider mb-3">配餐優化建議</p>

          {/* Tab 切換 */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                  activeTab === tab.key
                    ? 'bg-[#111111] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1：商品換掉 */}
          {activeTab === 'swap' && (
            <div className="space-y-3">
              {result.swapRecommendations.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">目前配餐無需替換建議</p>
              ) : (
                result.swapRecommendations.map((rec, i) => (
                  <div key={i} className="bg-slate-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-[#FEF1E2] text-[#C4714A] text-[10px] font-bold rounded-full">
                        {sessionLabel(rec.session)}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{rec.currentItem}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{rec.reason}</p>
                    {rec.alternatives.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {rec.alternatives.map((alt, j) => (
                          <div key={j} className="bg-white rounded-xl px-3 py-2 flex items-start gap-2">
                            <span className="text-[#C4714A] font-bold text-xs shrink-0 mt-0.5">→</span>
                            <div>
                              <p className="font-bold text-xs text-slate-900">{alt.name}</p>
                              <p className="text-[11px] text-slate-500">{alt.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => alert(`已記錄替換建議：${rec.currentItem} → ${rec.alternatives[0]?.name ?? '待選'}`)}
                      className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-[#C4714A] hover:text-[#C4714A] transition-colors"
                    >
                      換掉商品
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2：自拍成分 */}
          {activeTab === 'photo' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                拍攝鮮食/飼料成分，AI 將即時比對毛孩適合度並給分及十字內說明。
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:border-[#C4714A] hover:text-[#C4714A] transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {photoFile ? photoFile.name : '上傳/拍攝成分標籤'}
              </button>

              {photoFile && (
                <button
                  onClick={handlePhotoAnalyze}
                  disabled={photoAnalyzing}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors',
                    photoAnalyzing
                      ? 'bg-slate-200 text-slate-400'
                      : 'bg-[#C4714A] text-white hover:bg-[#b5623c]',
                  )}
                >
                  {photoAnalyzing ? <><Spinner className="text-slate-400" />分析中…</> : 'AI 即時分析'}
                </button>
              )}

              {photoError && <p className="text-xs text-red-500 font-bold">{photoError}</p>}

              {photoResult && (
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-slate-900">{photoResult.productName || '分析結果'}</p>
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', verdictColor(photoResult.verdict))}>
                      {verdictLabel(photoResult.verdict)}
                    </span>
                  </div>
                  {typeof photoResult.suitabilityScore === 'number' && (
                    <p className="text-xs text-slate-500">適配度 <strong className="text-[#C4714A]">{photoResult.suitabilityScore}%</strong></p>
                  )}
                  <p className="text-xs text-slate-600 leading-relaxed">{photoResult.summary}</p>
                  {photoResult.concerns && photoResult.concerns.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-red-500 mb-1">注意成分</p>
                      {photoResult.concerns.map((c, i) => (
                        <p key={i} className="text-xs text-slate-600">• {c.ingredient}：{c.reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 3：實體通路 */}
          {activeTab === 'store' && (
            <div className="space-y-3">
              {result.localStoreRecs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">暫無實體通路推薦</p>
              ) : (
                result.localStoreRecs.map((rec, i) => (
                  <div key={i} className="bg-slate-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                        {rec.store}
                      </span>
                      <span className="text-xs font-black text-[#C4714A]">適配 {rec.suitabilityScore}%</span>
                    </div>
                    <p className="font-bold text-sm text-slate-900 mb-1">{rec.productName}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{rec.comment}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4：輸入成分 */}
          {activeTab === 'ingredient' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ingredientInput}
                  onChange={e => setIngredientInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleIngredientQuery()}
                  placeholder="例：雞肉、南瓜、增稠劑..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-400"
                />
                <button
                  onClick={() => void handleIngredientQuery()}
                  disabled={ingredientQuerying || !ingredientInput.trim()}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-bold transition-colors',
                    ingredientQuerying || !ingredientInput.trim()
                      ? 'bg-slate-200 text-slate-400'
                      : 'bg-[#111111] text-white hover:bg-black',
                  )}
                >
                  {ingredientQuerying ? <Spinner className="text-slate-400" /> : '查詢'}
                </button>
              </div>

              {/* 熱門搜尋 */}
              <div className="flex flex-wrap gap-2">
                {HOT_SEARCH_CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => void handleIngredientQuery(chip)}
                    className="px-3 py-1 bg-[#FEF1E2] text-[#C4714A] text-xs font-bold rounded-full hover:bg-[#FDDFC8] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {ingredientError && <p className="text-xs text-red-500 font-bold">{ingredientError}</p>}

              {ingredientResult?.result?.flagged && ingredientResult.result.flagged.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 tracking-wider">成分分析結果</p>
                  {ingredientResult.result.flagged.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0', categoryColor(item.category))}>
                        {categoryLabel(item.category)}
                      </span>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{item.name}</p>
                        {item.reason && <p className="text-[11px] text-slate-500">{item.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ingredientResult && (!ingredientResult.result?.flagged || ingredientResult.result.flagged.length === 0) && (
                <div className="bg-green-50 rounded-2xl p-4 text-center">
                  <p className="text-sm font-bold text-green-600">未偵測到已知問題成分</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 詳細分析報告按鈕 */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-2xl text-sm hover:border-[#C4714A] hover:text-[#C4714A] transition-colors flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          點入詳細分析報告
        </button>
      </div>

      {/* 詳細報告 Modal */}
      {showModal && (
        <DetailedReportModal
          report={result.detailedReport}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ─── 換食計畫佔位 ─────────────────────────────────────────────────────────────

function SwitchPlanComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#F5EDE8] flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
      <h3 className="font-bold text-slate-900 text-lg mb-2">換食計畫</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">
        AI 智能換食計畫功能即將上線
        <br />
        敬請期待
      </p>
      <span className="mt-4 px-4 py-1.5 bg-[#F5EDE8] text-[#C4714A] text-xs font-bold rounded-full">
        即將推出
      </span>
    </div>
  )
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────

type TabKey = 'daily' | 'switch'

// 寵物基本資訊（從 API 取得後用於 AI 分析）
interface PetBasicInfo {
  name: string
  species: string
  breed?: string | null
  weight?: number | null
  mainProblems: string[]
  allergies: string[]
}

export default function DietPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('daily')
  const [openSession, setOpenSession] = useState<Session>('morning')
  const [petId, setPetId] = useState<string | null>(null)
  const [petInfo, setPetInfo] = useState<PetBasicInfo | null>(null)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<DietAnalysisResult | null>(null)
  const [aiError, setAiError] = useState('')

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // 取得今日計畫
  const fetchPlan = useCallback(async (pid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/meal-plans?petId=${pid}&date=${todayStr}`)
      if (res.ok) {
        const data = await res.json() as MealPlan | null
        setPlan(data)
      }
    } catch {
      // 靜默降級
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  // 取得寵物基本資訊（供 AI 分析使用）
  const fetchPetInfo = useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/pets/${pid}`)
      if (!res.ok) return
      const pet = await res.json() as {
        name: string
        species: string
        breed?: string | null
        weight?: number | null
        mainProblems?: string
        allergies?: string
      }
      setPetInfo({
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        weight: pet.weight,
        mainProblems: parseJson<string[]>(pet.mainProblems ?? '[]', []),
        allergies: parseJson<string[]>(pet.allergies ?? '[]', []),
      })
    } catch {
      // 靜默降級；AI 分析時 petInfo 為 null 則使用預設值
    }
  }, [])

  useEffect(() => {
    const pid = localStorage.getItem('drpet_currentPetId')
    if (pid) {
      setPetId(pid)
      void fetchPlan(pid)
      void fetchPetInfo(pid)
    } else {
      setLoading(false)
    }
  }, [fetchPlan, fetchPetInfo])

  // 確保有 plan（第一次新增品項時自動建立）
  const ensurePlan = useCallback(async (): Promise<MealPlan | null> => {
    if (plan) return plan
    if (!petId) return null
    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, date: todayStr }),
      })
      if (!res.ok) return null
      const newPlan = await res.json() as MealPlan
      setPlan(newPlan)
      return newPlan
    } catch {
      return null
    }
  }, [plan, petId, todayStr])

  // 包裝 onItemAdded，確保 plan 存在後再讓 AddItemForm 使用 planId
  const handleSessionNeedsPlan = useCallback(async (): Promise<string | null> => {
    const p = await ensurePlan()
    return p?.id ?? null
  }, [ensurePlan])

  const handleItemAdded = useCallback((item: MealPlanItem) => {
    setPlan(prev => {
      if (!prev) return prev
      return { ...prev, items: [...prev.items, item] }
    })
  }, [])

  const handleItemDeleted = useCallback((itemId: string) => {
    setPlan(prev => {
      if (!prev) return prev
      return { ...prev, items: prev.items.filter(it => it.id !== itemId) }
    })
  }, [])

  const handleAiAnalyze = async () => {
    if (!petId || !plan) return

    const allItems = plan.items
    if (allItems.length === 0) {
      setAiError('請先新增配餐項目再進行 AI 分析')
      return
    }

    setAiAnalyzing(true)
    setAiError('')
    setAiResult(null)

    try {
      const requestItems = allItems.map(it => ({
        session: it.session,
        customName: it.customName ?? undefined,
        productName: it.product?.name ?? undefined,
        quantity: it.quantity,
        unit: it.unit,
        tags: parseJson<string[]>(it.tags, []),
      }))

      const requestPetInfo = petInfo ?? {
        name: '毛孩',
        species: '未知',
        mainProblems: [],
        allergies: [],
      }

      const res = await fetch('/api/diet-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          planId: plan.id,
          items: requestItems,
          petInfo: requestPetInfo,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'AI 分析失敗')
      }

      const result = await res.json() as DietAnalysisResult
      setAiResult(result)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI 分析失敗，請重試')
    } finally {
      setAiAnalyzing(false)
    }
  }

  // 按時段過濾品項
  const itemsForSession = (session: Session): MealPlanItem[] =>
    (plan?.items ?? []).filter(it => it.session === session)

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* 頁面標題 */}
      <div className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md">
        <div className="max-w-[480px] mx-auto px-4 pt-12 pb-3">
          <h1 className="text-2xl font-bold text-[#2C1810]">飲食計畫</h1>

          {/* Tab 切換 */}
          <div className="mt-4 flex gap-1 bg-slate-100 rounded-2xl p-1">
            {([
              { key: 'daily' as TabKey, label: '日常配餐' },
              { key: 'switch' as TabKey, label: '換食計畫' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-bold transition-all',
                  activeTab === tab.key
                    ? 'bg-white text-[#2C1810] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 pb-40">
        {activeTab === 'switch' ? (
          <SwitchPlanComingSoon />
        ) : (
          <>
            {/* 當日日期 */}
            <div className="mt-4 mb-5">
              <p className="text-sm font-bold text-[#8B7355]">{formatDate(today)}</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="text-[#C4714A]" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* 三個時段 Accordion */}
                <SessionAccordionWithPlan
                  session="morning"
                  items={itemsForSession('morning')}
                  isOpen={openSession === 'morning'}
                  onToggle={() => setOpenSession(prev => prev === 'morning' ? 'morning' : 'morning')}
                  onOpen={() => setOpenSession('morning')}
                  plan={plan}
                  onEnsurePlan={handleSessionNeedsPlan}
                  onItemAdded={handleItemAdded}
                  onItemDeleted={handleItemDeleted}
                />
                <SessionAccordionWithPlan
                  session="noon"
                  items={itemsForSession('noon')}
                  isOpen={openSession === 'noon'}
                  onToggle={() => setOpenSession('noon')}
                  onOpen={() => setOpenSession('noon')}
                  plan={plan}
                  onEnsurePlan={handleSessionNeedsPlan}
                  onItemAdded={handleItemAdded}
                  onItemDeleted={handleItemDeleted}
                />
                <SessionAccordionWithPlan
                  session="evening"
                  items={itemsForSession('evening')}
                  isOpen={openSession === 'evening'}
                  onToggle={() => setOpenSession('evening')}
                  onOpen={() => setOpenSession('evening')}
                  plan={plan}
                  onEnsurePlan={handleSessionNeedsPlan}
                  onItemAdded={handleItemAdded}
                  onItemDeleted={handleItemDeleted}
                />

                {/* AI 分析結果（晚間 Accordion 下方） */}
                {aiError && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                    <p className="text-sm font-bold text-red-500">{aiError}</p>
                  </div>
                )}

                {aiResult && (
                  <AiAnalysisResult result={aiResult} petId={petId} />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部固定 AI 分析按鈕（日常配餐 Tab 才顯示） */}
      {activeTab === 'daily' && (
        <div className="fixed bottom-[60px] left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-[480px] mx-auto px-4 pb-3 pointer-events-auto">
            <button
              onClick={() => void handleAiAnalyze()}
              disabled={aiAnalyzing}
              className={cn(
                'w-full py-4 bg-[#111111] text-white font-bold rounded-2xl text-sm transition-opacity flex items-center justify-center gap-2 shadow-xl',
                aiAnalyzing && 'opacity-70',
              )}
            >
              {aiAnalyzing ? (
                <>
                  <Spinner className="text-white" />
                  <span>分析中…</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  AI 智能分析配餐
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 包裝 Accordion（管理 plan 建立的非同步流程）──────────────────────────────

interface SessionAccordionWithPlanProps {
  session: Session
  items: MealPlanItem[]
  isOpen: boolean
  onToggle: () => void
  onOpen: () => void
  plan: MealPlan | null
  onEnsurePlan: () => Promise<string | null>
  onItemAdded: (item: MealPlanItem) => void
  onItemDeleted: (itemId: string) => void
}

function SessionAccordionWithPlan({
  session,
  items,
  isOpen,
  onToggle,
  onOpen,
  plan,
  onEnsurePlan,
  onItemAdded,
  onItemDeleted,
}: SessionAccordionWithPlanProps) {
  // 確保使用者點擊展開後，若 plan 還不存在，先 POST 建立再展開
  const [resolvedPlanId, setResolvedPlanId] = useState<string | null>(plan?.id ?? null)

  // plan 從外部傳入時同步更新
  useEffect(() => {
    if (plan?.id) setResolvedPlanId(plan.id)
  }, [plan?.id])

  const handleToggle = async () => {
    if (!isOpen) {
      onOpen()
      // 若 plan 還沒建立，先建立
      if (!resolvedPlanId) {
        const pid = await onEnsurePlan()
        if (pid) setResolvedPlanId(pid)
      }
    } else {
      onToggle()
    }
  }

  return (
    <SessionAccordion
      session={session}
      items={items}
      isOpen={isOpen}
      onToggle={handleToggle}
      planId={resolvedPlanId}
      onItemAdded={onItemAdded}
      onItemDeleted={onItemDeleted}
    />
  )
}

// 防止 TypeScript 對未使用的 SESSIONS 常數報錯
void SESSIONS
