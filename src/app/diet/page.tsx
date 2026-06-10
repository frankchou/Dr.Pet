'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn, parseJson, formatDate } from '@/lib/utils'
import { usePollingRefresh } from '@/hooks/usePollingRefresh'
import type { DietAnalysisResult } from '@/app/api/diet-analysis/route'
import DietSwitchPlan from '@/components/diary/DietSwitchPlan'
import DailyReactionCard from '@/components/diary/DailyReactionCard'
import AddItemModal from '@/components/diary/AddItemModal'
import IngredientAnalysis from '@/components/home/IngredientAnalysis'
import CorrelationInsights from '@/components/nutrition/CorrelationInsights'
import AlternativeRecommendations from '@/components/nutrition/AlternativeRecommendations'

// 產品評分（「吃後感想」）為 v1 功能，現版暫時隱藏、保留待未來啟用。
// 其歸屬為飲食頁；要重新啟用把此旗標改為 true 即可。見 docs/未來功能.md。
const SHOW_PRODUCT_REACTIONS: boolean = false

// AI 產品替代推薦（AlternativeRecommendations）— frank 決定先隱藏。
// 元件保留不刪，未來要啟用把此旗標改為 true 即可。
const SHOW_ALTERNATIVE_RECS: boolean = false

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

// 比較兩份配餐計畫是否實質相同（供輪詢 silent 重抓時避免無謂重繪）。
// 以 plan id 與各品項的關鍵欄位（id/數量/單位/克數/標籤/名稱）做穩定比較，
// 僅在伺服器回傳內容真的有變動時才更新 state。
function isSamePlan(a: MealPlan | null, b: MealPlan | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.id !== b.id) return false
  if (a.items.length !== b.items.length) return false
  // 依 id 排序後逐項比對，避免後端回傳順序差異造成誤判
  const sortById = (items: MealPlanItem[]) => [...items].sort((x, y) => x.id.localeCompare(y.id))
  const ax = sortById(a.items)
  const bx = sortById(b.items)
  for (let i = 0; i < ax.length; i++) {
    const ai = ax[i]
    const bi = bx[i]
    if (
      ai.id !== bi.id ||
      ai.session !== bi.session ||
      ai.quantity !== bi.quantity ||
      ai.unit !== bi.unit ||
      ai.estimatedGrams !== bi.estimatedGrams ||
      ai.tags !== bi.tags ||
      (ai.product?.name ?? ai.customName ?? '') !== (bi.product?.name ?? bi.customName ?? '')
    ) {
      return false
    }
  }
  return true
}

// AI 運算準則說明（固定靜態文案，demo / 真實一致）。
// 沿用九大項標題；說明文字為精簡專業的「準則說明」，取代原由 AI 生成的 detailedReport，
// 改由報告右上角「分析準則」按鈕開啟的固定彈窗呈現。
const ANALYSIS_CRITERIA: Array<{ title: string; desc: string }> = [
  { title: '國際營養基準比對', desc: '以乾物質比 (DMB) 換算各項數據，對照 AAFCO 與 NRC 權威指引，客觀評估是否符合毛孩年齡階段的基礎營養需求。' },
  { title: '水分攝取預估參照', desc: '依體重精算每日基礎需水量，並比對配餐乾濕食佔比的含水量，預估水分缺口以協助泌尿道與腎臟保健。' },
  { title: '專屬飲食限制對照', desc: '依檔案設定攔截已知過敏原，並針對腎臟病控磷、心臟病低鈉、結石控鎂鈣等特殊需求進行數值超標預警。' },
  { title: '成分學理客觀標註', desc: '依 WSAVA 營養指南與臨床毒理文獻，中立標示爭議性人工添加物，並標註具實證的機能性原料供長期選購參考。' },
  { title: '官方食安通報同步', desc: '定期對接 FDA、TFDA 等官方公開資訊，配餐若含近期通報下架或配方異動商品，即時發出風險提示。' },
  { title: '潛在藥食關聯提示', desc: '依檔案中註記的藥物療程，評估配餐特定營養素是否影響藥效，輔助錯開餵食時間（實際給藥請遵獸醫醫囑）。' },
  { title: '動態熱量變數試算', desc: '結合活動量與環境變數估算每日熱量需求，於極端氣溫或活動量明顯變化時動態提出總熱量微調建議。' },
  { title: '換食過渡配比推估', desc: '追蹤新商品引入天數與比例，換食幅度過大時依獸醫常規發出腸胃不適預警，並產出 7 天漸進換食配比建議。' },
  { title: '日誌時序關聯比對', desc: '比對日誌異常與近期飲食變更：腸胃異常回溯近 48 小時、皮膚 / 淚腺溯源近 14 天，提取潛在飲食關聯供參考。' },
]

const HOT_SEARCH_CHIPS = ['鱈魚原肉配方', '深海起司罐身', '去皮鮮嫩乾糧']

// 降級用 mock 配餐分析結果。
// 正式環境一律由 /api/diet-analysis（AI）產生；此 mock 僅在 AI 失敗時降級顯示，
// 讓畫面（含詳細報告九大項）能呈現以供驗證長相。內容取自設計圖 diet-ai-analysis-*。
const MOCK_DIET_ANALYSIS: DietAnalysisResult = {
  score: 92,
  protein: 26,
  fat: 14,
  calciumPhosphorus: '1.1:1',
  moisture: 78,
  alerts: [
    { type: 'warning', message: '磷含量過高 (1.4%)' },
    { type: 'warning', message: '水分不足 (60%)' },
  ],
  expertComment: '學理分析示磷值達臨界，應增水代謝。同步官方通報無警示批次，請安心餵食。',
  swapRecommendations: [
    {
      session: 'morning',
      currentItem: '自然本色小型成犬 亮白無穀鮭魚',
      reason: '磷偏高恐傷腎',
      alternatives: [{ name: '健康低磷鮮燉罐', reason: '無膠特調控磷配比' }],
    },
    {
      session: 'evening',
      currentItem: '自然本色亮白無穀鮭魚',
      reason: '鈉偏高腎臟負擔',
      alternatives: [{ name: '黃金南瓜鮮蒸雞肉', reason: '鉀離子含量優防脫' }],
    },
  ],
  localStoreRecs: [
    { store: '全聯福利中心', productName: '大成安心手撕雞胸', suitabilityScore: 96, comment: '原型食物低磷高水' },
    { store: '寵物公園 (門市)', productName: '健康低磷鮮燉罐', suitabilityScore: 94, comment: '無膠特調控磷配比' },
    { store: '大樹寵物 (店面)', productName: '黃金南瓜鮮蒸雞肉', suitabilityScore: 91, comment: '鉀離子含量優防脫' },
  ],
  detailedReport: {
    nutritionStandard:
      '系統依據美國飼料品管協會 (AAFCO) 與美國國家科學研究委員會 (NRC) 的國際權威指引，將您配餐的數據統一轉換為「乾物質比 (Dry Matter Basis, DMB)」。藉此剔除水分干擾，客觀評估粗蛋白、脂肪、碳水化合物及微量元素，是否確實符合毛孩當前年齡階段之基礎需求。',
    hydration:
      '水分是預防泌尿道與腎臟疾病的關鍵。系統將依據毛孩體重精算每日基礎需水量，並比對當前配餐中的含水量（如乾糧與濕食的佔比），精準預估水分缺口，提醒您是否需要額外引導毛孩喝水。',
    dietaryRestrictions:
      '系統將嚴格為您的設定把關。自動比對配餐成分以攔截「已知過敏原」（如牛肉、雞肉、乳製品、大豆或特定穀物）；並針對不同疾病之特殊健康需求（如腎臟病需嚴控磷攝取、心臟病需低鈉、泌尿道結石需控鎂與鈣），進行數值超標預警，協助落實居家疾病飲食管理。',
    ingredientScience:
      '系統全數依據世界小動物獸醫醫學會 (WSAVA) 營養指南與臨床毒理學文獻進行中立標示。系統會提示配餐中的「非必要人工添加物或爭議性成分」（如特定化學防腐劑、人工色素），同時也標註具備科學實證的「機能性益生原料」（如 Omega-3 脂肪酸），提供您長期選購的客觀參考。',
    foodSafetyAlert:
      '系統定期對接 FDA (美國食品藥物管理局) 與 TFDA 等官方機構之公開資訊。若當前配餐中包含近期經官方通報為「預防性下架、重金屬超標或配方重大異動」之商品，系統將即時發出風險阻斷提示。',
    drugFoodInteraction:
      '若您在檔案中註記毛孩正處於特定藥物療程（如服用抗生素、利尿劑、甲狀腺藥物），系統將運算當前配餐中的特定營養素（如高濃度鈣離子）是否會產生化學螯合作用而降低藥效，輔助您適當錯開餵食時間（註：實際給藥指引請絕對遵從主治獸醫醫囑）。',
    calorieCalculation:
      '考量基礎代謝率會隨環境浮動，系統將結合在地氣象數據與您輸入的日活動量。如遇極端低溫需產熱，或長期活動量驟減時，系統將動態提出總熱量微調建議。',
    foodTransition:
      '系統自動追蹤新商品之「引入天數與餵食比例」。若偵測單次換食幅度過大，將依據獸醫常規換食指引發出潛在急性腸胃不適預警，並產出符合學理的「7 天漸進換食配比建議」，防範因突然換食造成的腸胃負擔。',
    logCorrelation:
      '結合獸醫臨床病理的時序特性，系統具備動態回溯功能。若您於日誌中記載腸胃異常（如軟便），系統將比對近 48 小時內的飲食變更；若為皮膚或淚腺狀態異常，則延伸溯源至近 14 天的成分疊加情形，提取潛在的飲食關聯數據供您與獸醫參考。',
  },
}

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

const InfoIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

// ─── 時段 Accordion ───────────────────────────────────────────────────────────

interface SessionAccordionProps {
  session: Session
  items: MealPlanItem[]
  isOpen: boolean
  onToggle: () => void
  planId: string | null
  petId: string | null
  // 此計畫已加入的產品名稱（modal 顯示「已加入」徽章用）
  addedNames: Set<string>
  // 配餐計畫建立失敗時為錯誤訊息（用於前端硬化：不再無限轉圈）
  planError: string | null
  // 重試建立配餐計畫
  onRetryPlan: () => void
  onItemAdded: (item: MealPlanItem) => void
  onItemDeleted: (itemId: string) => void
  onItemQuantityChanged: (itemId: string, quantity: number) => void
}

// 展開狀態下可編輯的配餐數量輸入框。
// 採本地暫存值，於 onBlur / Enter 觸發儲存（樂觀更新由父層處理）；
// 失焦或送出時若為空 / 非正數，回填原數量，避免存入無效值。
function QuantityInput({
  value,
  onCommit,
}: {
  value: number
  onCommit: (next: number) => void
}) {
  const [draft, setDraft] = useState(String(value))

  // 外部數量變動（含回滾）時同步顯示值
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = () => {
    const next = Number(draft)
    if (!Number.isFinite(next) || next <= 0) {
      setDraft(String(value))
      return
    }
    onCommit(next)
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0.5}
      step={0.5}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className="w-12 px-1 py-2 bg-white border border-slate-200 rounded-xl text-center text-base font-bold text-slate-900 tabular-nums outline-none focus:ring-2 focus:ring-[#FDDFC8] focus:border-[#FDDFC8] transition-all"
      aria-label="配餐數量"
    />
  )
}

function SessionAccordion({
  session,
  items,
  isOpen,
  onToggle,
  planId,
  petId,
  addedNames,
  planError,
  onRetryPlan,
  onItemAdded,
  onItemDeleted,
  onItemQuantityChanged,
}: SessionAccordionProps) {
  const [showModal, setShowModal] = useState(false)
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
    // 加入後不關閉 modal，允許連續加入多項（設計圖為持續搜尋選取）
  }

  // 配餐數量編輯：樂觀更新先寫入 UI，PATCH 失敗則回滾並提示。
  const handleQuantityChange = async (item: MealPlanItem, next: number) => {
    if (!planId) return
    if (!Number.isFinite(next) || next <= 0) return
    if (next === item.quantity) return
    const prev = item.quantity
    onItemQuantityChanged(item.id, next)
    try {
      const res = await fetch(`/api/meal-plans/${planId}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, quantity: next }),
      })
      if (!res.ok) throw new Error('update failed')
    } catch {
      onItemQuantityChanged(item.id, prev)
      alert('更新數量失敗，請稍後再試')
    }
  }

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
            <span className="block font-bold text-slate-900 leading-tight">{meta.label}</span>
            <span className="block text-[10px] font-bold text-slate-400 tracking-wider">{meta.en}</span>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp size={18} className="text-slate-400 shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-slate-400 shrink-0" />
        )}
      </button>

      {/* 收合摘要：精簡列出「產品名 (數量 單位)」（見 diet-meal-session-collapsed 設計圖） */}
      {!isOpen && (
        <div className="px-4 pb-4 -mt-1">
          {items.length > 0 ? (
            <ul className="space-y-2">
              {items.map(item => {
                const name = item.product?.name ?? item.customName ?? '未命名'
                return (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-slate-700 font-medium">{name}</span>
                    <span className="text-slate-400 font-medium shrink-0">
                      ({item.quantity} {item.unit})
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">尚未添加配餐項目</p>
          )}
        </div>
      )}

      {/* 展開內容（見 diet-meal-session-expanded 設計圖） */}
      {isOpen && (
        <div className="px-4 pb-4">
          {/* 品項列表 */}
          {items.length > 0 ? (
            <div className="space-y-1 mb-3">
              {items.map(item => {
                const name = item.product?.name ?? item.customName ?? '未命名'
                const tags = parseJson<string[]>(item.tags, [])
                return (
                  <div key={item.id}>
                    <div className="flex items-start gap-3 py-2.5">
                      {/* 資訊圖示 */}
                      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                        <InfoIcon size={18} className="text-slate-300" />
                      </div>

                      {/* 品名 + 標籤 */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 leading-snug">{name}</p>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
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

                      {/* 數量框（可編輯）+ 單位 + 刪除 */}
                      <div className="flex items-center gap-2 shrink-0">
                        <QuantityInput
                          value={item.quantity}
                          onCommit={(next) => void handleQuantityChange(item, next)}
                        />
                        <span className="text-sm text-slate-500 font-medium w-7">{item.unit}</span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
                          aria-label="刪除此項目"
                        >
                          {deletingId === item.id ? (
                            <Spinner className="text-slate-300 w-3.5 h-3.5 border" />
                          ) : (
                            <XIcon size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 預估克數（右對齊縮排） */}
                    {item.estimatedGrams != null && (
                      <p className="text-xs text-slate-400 text-right pr-12 -mt-1 mb-1">
                        ↳ 預估約 <span className="font-bold">{item.estimatedGrams}</span> 克
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-3 text-center">
              <p className="text-sm text-slate-400">尚未添加配餐項目</p>
            </div>
          )}

          {/* 添加項目按鈕 → 開 bottom-sheet modal（AI 產品搜尋選取）。
              前端硬化：建立計畫中 / 失敗時不開 modal，改顯示狀態＋可重試。 */}
          {showModal && !planId && planError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 space-y-2">
              <p className="text-sm font-bold text-red-500">{planError}</p>
              <div className="flex gap-2">
                <button
                  onClick={onRetryPlan}
                  className="flex-1 py-2 rounded-xl bg-[#C4714A] text-white text-sm font-bold hover:bg-[#b5623c] transition-colors"
                >
                  重試
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : showModal && !planId ? (
            <div className="w-full py-2.5 flex items-center justify-center gap-2 text-sm text-slate-400">
              <Spinner className="text-slate-300 w-4 h-4" />
              建立配餐計畫中…
            </div>
          ) : (
            <button
              onClick={() => {
                setShowModal(true)
                // 預設展開的時段（如早餐）不會經過 toggle，計畫可能還沒建立 →
                // 點「繼續添加項目」時若尚無 planId 就主動觸發建立，避免無限轉圈。
                if (!planId) onRetryPlan()
              }}
              className="w-full py-3 border border-dashed border-slate-300 rounded-2xl text-sm font-bold text-slate-500 hover:border-[#C4714A] hover:text-[#C4714A] transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              {items.length > 0 ? '繼續添加項目' : '添加項目'}
            </button>
          )}
        </div>
      )}

      {/* AI 產品搜尋 bottom-sheet modal（planId 就緒後才掛載） */}
      {showModal && planId && (
        <AddItemModal
          planId={planId}
          session={session}
          petId={petId}
          addedNames={addedNames}
          onAdded={handleItemAdded}
          onClose={() => setShowModal(false)}
        />
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
  // 顯示用文字（如鈣磷比「1.1:1」），未提供時用 value+unit
  displayValue?: string
}

function NutrientBar({ label, value, max, color, unit = '%', displayValue }: NutrientBarProps) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      {/* 標籤列：左標籤、右數值（對照 diet-ai-analysis-01/02 的 2×2 排版） */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <span className="text-sm font-black" style={{ color }}>
          {displayValue ?? `${value}${unit}`}
        </span>
      </div>
      <div className="bg-slate-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ─── 分析準則固定彈窗（6-4a）─────────────────────────────────────────────────
// 內容固定寫死（demo / 真實一致）：系統分析基礎宣告 + 九大運算準則靜態說明。
// 由報告右上角「分析準則」按鈕開啟，取代原由 AI 生成的九大項報告。

interface AnalysisCriteriaModalProps {
  onClose: () => void
}

function AnalysisCriteriaModal({ onClose }: AnalysisCriteriaModalProps) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-[480px] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 標題（對照 report-01：圖示 + 中文標題 + 英文副標 + 關閉鈕） */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2C2C2E] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
                <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1L12 3z" />
                <circle cx="18.5" cy="5.5" r="1.5" fill="#fff" stroke="none" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-lg text-[#2C1810] leading-tight">AI 分析準則說明</h2>
              <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-0.5 leading-tight">
                ANALYSIS CRITERIA
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
              aria-label="關閉"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* 捲動內容 */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* 系統分析基礎宣告（固定文案） */}
          <div className="bg-[#2C2C2E] text-white rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-2.5">
              <svg viewBox="0 0 24 24" fill="#E08A4F" stroke="none" width={18} height={18}>
                <path d="M12 2l1.6 4.9L18.5 8.5l-4.9 1.6L12 15l-1.6-4.9L5.5 8.5l4.9-1.6L12 2z" />
              </svg>
              <p className="text-sm font-bold">系統分析基礎宣告</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-200">
              本系統依據您設定的毛孩專屬健康檔案、目前飲食與日誌，透過以下 9 大客觀數據進行綜合交叉分析。所有結果僅供參考，無法取代專業獸醫師之診斷與處置。
            </p>
          </div>

          {/* 九大運算準則分隔 */}
          <div>
            <p className="text-sm font-bold text-slate-400 tracking-[0.3em] mb-2">九大運算準則</p>
            <div className="h-px bg-gradient-to-r from-slate-300 to-transparent" />
          </div>

          {/* 9 大分項（編號圓圈 + 標題 + 固定說明） */}
          <div className="space-y-7">
            {ANALYSIS_CRITERIA.map(({ title, desc }, idx) => (
              <div key={title} className="flex gap-4">
                <span className="w-10 h-10 rounded-full bg-[#2C2C2E] text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-base mb-2">{title}</p>
                  <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部：版本標記 + 確認鈕 */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-slate-300 tracking-wider">AI SYNTHESIS CRITERIA</span>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#2C2C2E] text-white font-bold rounded-full text-sm hover:bg-[#1c1c1e] transition-colors"
          >
            確認並關閉
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 全域綜合飲食分析報告 Modal（6-4b）────────────────────────────────────────
// 報告本體＝成分綜合分析的豐富格式（IngredientAnalysis：風險統計/風險總覽/營養表/
// 補充建議/AI 營養安全風險）＋ AI 產品替代推薦（AlternativeRecommendations）＋
// 最下方 AI 關聯分析（CorrelationInsights）。右上角「分析準則」按鈕開啟固定說明彈窗。

interface DetailedReportModalProps {
  petId: string | null
  onClose: () => void
}

function DetailedReportModal({ petId, onClose }: DetailedReportModalProps) {
  const [showCriteria, setShowCriteria] = useState(false)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-[480px] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal 標題（圖示 + 中文標題 + 英文副標 + 分析準則鈕 + 關閉鈕） */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#2C2C2E] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
                <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1L12 3z" />
                <circle cx="18.5" cy="5.5" r="1.5" fill="#fff" stroke="none" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-lg text-[#2C1810] leading-tight">全域綜合飲食分析報告</h2>
              <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-0.5 leading-tight">
                GLOBAL DIETARY<br />COMPREHENSIVE REPORT
              </p>
            </div>
            {/* 分析準則按鈕（右上角，關閉鈕左側） */}
            <button
              onClick={() => setShowCriteria(true)}
              className="h-9 px-3 rounded-full bg-[#FEF1E2] text-[#C4714A] text-xs font-bold flex items-center gap-1.5 hover:bg-[#FDDFC8] transition-colors shrink-0"
              aria-label="查看分析準則"
            >
              <InfoIcon size={14} />
              分析準則
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
              aria-label="關閉"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* 捲動內容：成分綜合分析 + 替代品推薦 + AI 關聯分析 */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {petId ? (
            <>
              {/* 成分綜合分析（風險統計/風險總覽/營養表/補充建議/AI 營養安全風險） */}
              <IngredientAnalysis petId={petId} />
              {/* AI 產品替代推薦（針對有毒 / 警示產品）— 暫時隱藏（SHOW_ALTERNATIVE_RECS） */}
              {SHOW_ALTERNATIVE_RECS && <AlternativeRecommendations petId={petId} />}
              {/* AI 關聯分析（症狀 × 飲食） */}
              <CorrelationInsights petId={petId} />
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">尚未選擇毛孩</p>
          )}
        </div>

        {/* 底部：版本標記 + 確認鈕 */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-slate-300 tracking-wider">AI SYNTHESIS REPORT V2.4</span>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#2C2C2E] text-white font-bold rounded-full text-sm hover:bg-[#1c1c1e] transition-colors"
          >
            確認並關閉
          </button>
        </div>
      </div>

      {showCriteria && <AnalysisCriteriaModal onClose={() => setShowCriteria(false)} />}
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

  const TABS: Array<{ key: AnalysisTab; label: string; icon: React.ReactNode }> = [
    {
      key: 'swap',
      label: '商品換掉',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      ),
    },
    {
      key: 'photo',
      label: '自拍成分',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      ),
    },
    {
      key: 'store',
      label: '實體通路',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
          <path d="M3 9l1-5h16l1 5M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M3 9h18" />
        </svg>
      ),
    },
    {
      key: 'ingredient',
      label: '輸入成分',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
  ]

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm mt-4">
        {/* 標題列 + 評分（對照 diet-ai-analysis-01/02：左側腦圖示 + 標題/副標，右側大分數） */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#2C2C2E] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
                <path d="M12 2a3 3 0 0 0-3 3v.5A2.5 2.5 0 0 0 6.5 8 2.5 2.5 0 0 0 5 12.5 2.5 2.5 0 0 0 6.5 17 3 3 0 0 0 12 19a3 3 0 0 0 5.5-2 2.5 2.5 0 0 0 1.5-4.5A2.5 2.5 0 0 0 17.5 8 2.5 2.5 0 0 0 15 5.5V5a3 3 0 0 0-3-3z" />
                <path d="M12 2v17" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">AI 智能配餐重點分析</h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">核心指標匯總</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-black text-[#C4714A] leading-none">
              {result.score}<span className="text-base font-bold">分</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">綜合適配度</p>
          </div>
        </div>

        {/* 核心指標（2×2 排列，對照設計圖） */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-3 mb-3">
          <NutrientBar label="蛋白" value={result.protein} max={60} color="#E08A4F" />
          <NutrientBar label="脂肪" value={result.fat} max={40} color="#F0C14B" />
          <NutrientBar label="鈣磷比" value={parseFloat(result.calciumPhosphorus)} max={2.5} color="#5C6B5A" unit="" displayValue={result.calciumPhosphorus} />
          <NutrientBar label="水分" value={result.moisture} max={100} color="#4F86E0" />
        </div>

        {/* 容差圖例（對照設計圖 01/02 核心指標下方） */}
        <div className="flex items-center gap-4 mb-4">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span className="w-4 h-2.5 rounded-full bg-slate-200" />個體建議容差
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span className="w-4 h-2.5 rounded-full bg-[#FCE4D2]" />腎臟病專屬容差
          </span>
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
          <p className="text-sm text-slate-700 leading-relaxed font-medium">&quot;{result.expertComment}&quot;</p>
        </div>

        {/* 配餐優化建議卡（對照 diet-ai-analysis-03~06：標題列 + AI 輔助徽章 + 四分類標籤 + 內容） */}
        <div className="mb-4 bg-[#FBFAF8] border border-slate-100 rounded-2xl p-4">
          {/* 標題列 */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#E08A4F] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
                <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1L12 3z" />
              </svg>
            </div>
            <h4 className="flex-1 font-black text-slate-900 text-base leading-tight">腎病飲食調配與商品推薦調換</h4>
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#5C6B5A] text-white text-[10px] font-bold">AI 輔助</span>
          </div>

          {/* 四分類資訊標籤（icon + 文字，對應 03~06） */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {TABS.map(tab => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all',
                    active
                      ? 'bg-white border border-[#E08A4F] shadow-sm text-[#C4714A]'
                      : 'bg-white/60 border border-transparent text-slate-400 hover:text-slate-600',
                  )}
                >
                  <span className={cn(active ? 'text-[#C4714A]' : 'text-slate-400')}>{tab.icon}</span>
                  <span className={cn('text-xs font-bold', active ? 'text-slate-800' : 'text-slate-500')}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tab 1：商品換掉 */}
          {activeTab === 'swap' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                🔍 診斷：早、中、晚三餐成分中，以下商品建議更換，幫助毛孩遠離健康風險。
              </p>
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

          {/* Tab 2：自拍成分（對照 diet-ai-analysis-04：說明 + 置中相機虛線框） */}
          {activeTab === 'photo' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                📸 自拍照成分比對：拍攝鮮食/飼料成分，AI 將即時比對毛孩適合度並給分及十字內說明。
              </p>
              {/* capture="environment" → 手機點擊直接開後鏡頭；電腦版則回退為選檔上傳 */}
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
                className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-[#C4714A] hover:text-[#C4714A] transition-colors flex flex-col items-center justify-center gap-2"
              >
                <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {photoFile ? photoFile.name : '拍攝/上傳背面包裝成分圖'}
                </span>
                <span className="text-xs text-slate-400">支持即時 OCR 辨識多寡項</span>
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

        {/* 詳細分析報告按鈕（對照 diet-ai-analysis-06：深色實心鈕） */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-4 bg-[#2C2C2E] text-white font-bold rounded-2xl text-sm hover:bg-[#1c1c1e] transition-colors flex items-center justify-center gap-2"
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
          petId={petId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
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
  const [openSession, setOpenSession] = useState<Session | null>('morning')
  const [petId, setPetId] = useState<string | null>(null)
  const [petInfo, setPetInfo] = useState<PetBasicInfo | null>(null)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<DietAnalysisResult | null>(null)
  const [aiError, setAiError] = useState('')

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // 取得今日計畫。`silent` 為輪詢重抓用：不顯示整頁 spinner，避免閃爍。
  const fetchPlan = useCallback(async (pid: string, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/meal-plans?petId=${pid}&date=${todayStr}`)
      if (res.ok) {
        const data = await res.json() as MealPlan | null
        // silent（輪詢）重抓時先比對內容，無實際變動就不 setPlan，
        // 避免每次輪詢都產生全新物件造成無謂重繪/閃爍（aiResult 為獨立 state，不受影響）。
        setPlan(prev => (silent && isSamePlan(prev, data) ? prev : data))
      }
    } catch {
      // 靜默降級
    } finally {
      if (!silent) setLoading(false)
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

  // 共享資料即時同步：定時 / 重新聚焦時重抓今日配餐（不重抓寵物基本資訊，較少變動）
  const refreshShared = useCallback(() => {
    if (petId) void fetchPlan(petId, true)
  }, [petId, fetchPlan])
  usePollingRefresh(refreshShared)

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

  // 包裝 onItemAdded，確保 plan 存在後再讓 AddItemModal 使用 planId
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

  const handleItemQuantityChanged = useCallback((itemId: string, quantity: number) => {
    setPlan(prev => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map(it => (it.id === itemId ? { ...it, quantity } : it)),
      }
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
      // 降級：AI 失敗時仍以 mock 呈現畫面供驗證長相（正式環境主資料一律走 AI）。
      // 同時保留錯誤提示，讓使用者知道目前看到的是示意內容。
      setAiResult(MOCK_DIET_ANALYSIS)
      const msg = e instanceof Error ? e.message : 'AI 分析失敗'
      setAiError(`AI 分析暫時無法使用（${msg}），以下為示意內容。`)
    } finally {
      setAiAnalyzing(false)
    }
  }

  // 按時段過濾品項
  const itemsForSession = (session: Session): MealPlanItem[] =>
    (plan?.items ?? []).filter(it => it.session === session)

  // 已加入此計畫的產品名稱（modal 顯示「已加入」徽章用）
  const addedNames = new Set<string>(
    (plan?.items ?? []).map(it => it.product?.name ?? it.customName ?? '').filter(Boolean),
  )

  return (
    <div className="px-6 md:px-8 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pb-36">

      {/* Tab 切換 */}
      <div className="flex bg-slate-100 p-1.5 rounded-full mb-5">
        {([
          { key: 'daily' as TabKey, label: '日常配餐' },
          { key: 'switch' as TabKey, label: '換食計畫' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-2 rounded-full text-sm font-bold transition-all',
              activeTab === tab.key
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-slate-500 hover:text-black',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === 'switch' ? (
          <DietSwitchPlan petId={petId ?? ''} />
        ) : (
          <>
            {/* 當日日期 */}
            <div className="mt-4 mb-5">
              <p className="text-sm font-bold text-[#8B7355]">{formatDate(today)}</p>
            </div>

            {/* 產品評分（吃後感想）— v1 功能，暫時隱藏，見 docs/未來功能.md */}
            {SHOW_PRODUCT_REACTIONS && petId && (
              <div className="mb-5">
                <DailyReactionCard petId={petId} date={todayStr} />
              </div>
            )}

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
                  onToggle={() => setOpenSession(null)}
                  onOpen={() => setOpenSession('morning')}
                  plan={plan}
                  onEnsurePlan={handleSessionNeedsPlan}
                  onItemAdded={handleItemAdded}
                  onItemDeleted={handleItemDeleted}
                  onItemQuantityChanged={handleItemQuantityChanged}
                  petId={petId}
                  addedNames={addedNames}
                />
                <SessionAccordionWithPlan
                  session="noon"
                  items={itemsForSession('noon')}
                  isOpen={openSession === 'noon'}
                  onToggle={() => setOpenSession(null)}
                  onOpen={() => setOpenSession('noon')}
                  plan={plan}
                  onEnsurePlan={handleSessionNeedsPlan}
                  onItemAdded={handleItemAdded}
                  onItemDeleted={handleItemDeleted}
                  onItemQuantityChanged={handleItemQuantityChanged}
                  petId={petId}
                  addedNames={addedNames}
                />
                <SessionAccordionWithPlan
                  session="evening"
                  items={itemsForSession('evening')}
                  isOpen={openSession === 'evening'}
                  onToggle={() => setOpenSession(null)}
                  onOpen={() => setOpenSession('evening')}
                  plan={plan}
                  onEnsurePlan={handleSessionNeedsPlan}
                  onItemAdded={handleItemAdded}
                  onItemDeleted={handleItemDeleted}
                  onItemQuantityChanged={handleItemQuantityChanged}
                  petId={petId}
                  addedNames={addedNames}
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
        <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-40 md:static md:mt-6 md:mb-2">
          <div className="px-6 md:px-0 pb-3 md:pb-0">
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
  petId: string | null
  addedNames: Set<string>
  onEnsurePlan: () => Promise<string | null>
  onItemAdded: (item: MealPlanItem) => void
  onItemDeleted: (itemId: string) => void
  onItemQuantityChanged: (itemId: string, quantity: number) => void
}

function SessionAccordionWithPlan({
  session,
  items,
  isOpen,
  onToggle,
  onOpen,
  plan,
  petId,
  addedNames,
  onEnsurePlan,
  onItemAdded,
  onItemDeleted,
  onItemQuantityChanged,
}: SessionAccordionWithPlanProps) {
  // 本地剛建立的 planId（尚未經外部 plan prop 回傳前的暫存）。
  // 實際使用的 planId 以外部 plan?.id 為優先，於 render 期間直接衍生，
  // 不在 effect 內 setState（避免 react-hooks/set-state-in-effect）。
  const [localPlanId, setLocalPlanId] = useState<string | null>(null)
  const resolvedPlanId = plan?.id ?? localPlanId
  // 建立配餐計畫失敗時的錯誤訊息（前端硬化：不再無限轉圈，改顯示錯誤＋可重試）
  const [planError, setPlanError] = useState<string | null>(null)

  // 嘗試建立配餐計畫；失敗時記錄錯誤供 UI 顯示與重試
  const tryEnsurePlan = useCallback(async () => {
    setPlanError(null)
    const pid = await onEnsurePlan()
    if (pid) {
      setLocalPlanId(pid)
    } else {
      setPlanError('建立配餐計畫失敗，請檢查網路後重試')
    }
  }, [onEnsurePlan])

  const handleToggle = async () => {
    if (!isOpen) {
      onOpen()
      // 若 plan 還沒建立，先建立
      if (!resolvedPlanId) await tryEnsurePlan()
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
      petId={petId}
      addedNames={addedNames}
      planError={planError}
      onRetryPlan={() => void tryEnsurePlan()}
      onItemAdded={onItemAdded}
      onItemDeleted={onItemDeleted}
      onItemQuantityChanged={onItemQuantityChanged}
    />
  )
}

// 防止 TypeScript 對未使用的 SESSIONS 常數報錯
void SESSIONS
