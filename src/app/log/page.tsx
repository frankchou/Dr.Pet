'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Select, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ProductEditModal from '@/components/product/ProductEditModal'
import type { ProductForEdit } from '@/components/product/ProductEditModal'
import { productTypeLabel, formatDate } from '@/lib/utils'

type Product = ProductForEdit & { type: string; name: string; brand?: string | null }
interface Usage {
  id: string; productId: string; date: string
  frequency?: string | null; amountLevel?: string | null; notes?: string | null
  product: Product
}
interface Pet { id: string; name: string; species: string }
interface PetProduct {
  id: string; listType: string; trialReason?: string | null
  productId: string; product: Product
}
interface ProductReaction {
  id: string; productId: string; rating: string; notes?: string | null
}
interface CommunityRec {
  id: string; fromAI: boolean; basedOnCount: number; aiRationale?: string | null
  badProduct: Product; recommendedProduct: Product
}

const TYPE_ORDER = ['feed', 'can', 'snack', 'supplement', 'dental', 'shampoo', 'other']
const TYPE_EMOJIS: Record<string, string> = {
  feed:'🍚', can:'🥫', snack:'🦴', supplement:'💊', dental:'🦷', shampoo:'🧴', other:'📦',
}
// ─── Month Calendar ──────────────────────────────────────────────────────────
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function MonthCalendar({
  usages,
  selectedDate,
  onSelectDate,
}: {
  usages: Usage[]
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const datesWithRecords = new Set(usages.map((u) => u.date.slice(0, 10)))
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const todayStr = today.toISOString().slice(0, 10)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className="font-semibold text-sm text-[#1a1a2e]">
          {viewYear} 年 {MONTH_NAMES[viewMonth]}
        </p>
        <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-t border-gray-50 bg-gray-50/60">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`text-center text-[10px] py-1.5 font-medium ${i === 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasRecord = datesWithRecords.has(dateStr)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const isSunday = i % 7 === 0
          return (
            <button
              key={i}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className="flex flex-col items-center py-1.5 gap-0.5"
            >
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-[#C4714A] text-white'
                  : isToday
                  ? 'bg-[#FFF5EF] text-[#C4714A] font-bold ring-1 ring-[#C4714A]/30'
                  : isSunday
                  ? 'text-red-400 hover:bg-gray-100'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                {day}
              </span>
              {hasRecord && (
                <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-[#C4714A]'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Inline usage edit form ──────────────────────────────────────────────────
function UsageEditForm({
  usage, onSaved, onCancel,
}: {
  usage: Usage
  onSaved: (updated: Usage) => void
  onCancel: () => void
}) {
  const [frequency, setFrequency]     = useState(usage.frequency || '')
  const [amountLevel, setAmountLevel] = useState(usage.amountLevel || '')
  const [notes, setNotes]             = useState(usage.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/usages/${usage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: frequency || null, amountLevel: amountLevel || null, notes: notes || null }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      onSaved(updated)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
      <Select label="頻率" value={frequency} onChange={(e) => setFrequency(e.target.value)}
        options={[
          { value:'', label:'未設定' },
          { value:'每日', label:'每日' }, { value:'每週數次', label:'每週數次' },
          { value:'每週', label:'每週' }, { value:'偶爾', label:'偶爾' },
        ]} />
      <Select label="用量" value={amountLevel} onChange={(e) => setAmountLevel(e.target.value)}
        options={[
          { value:'', label:'未設定' },
          { value:'少量', label:'少量' }, { value:'正常', label:'正常' }, { value:'多量', label:'多量' },
        ]} />
      <Textarea label="備註" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="備註說明" />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} loading={saving} className="flex-1">儲存</Button>
        <Button size="sm" variant="secondary" onClick={onCancel} className="flex-1">取消</Button>
      </div>
    </div>
  )
}

// ─── Daily Reaction Section ───────────────────────────────────────────────────
function DailyReactionSection({
  petProducts, dayReactions, reactionSaving, onRate,
}: {
  petProducts: PetProduct[]
  dayReactions: ProductReaction[]
  reactionSaving: string | null
  onRate: (productId: string, rating: string) => void
}) {
  if (petProducts.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <p className="text-sm font-semibold text-gray-700 mb-0.5">今日吃後感想</p>
      <p className="text-xs text-gray-400">
        尚未建立產品清單，
        <Link href="/products" className="text-[#C4714A] underline-offset-2">前往新增</Link>
      </p>
    </div>
  )

  const RATING_CONFIG = {
    good: { emoji: '👍', active: 'bg-green-100 text-green-700 ring-1 ring-green-300', inactive: 'bg-gray-50 text-gray-400' },
    ok:   { emoji: '😐', active: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300', inactive: 'bg-gray-50 text-gray-400' },
    bad:  { emoji: '👎', active: 'bg-red-100 text-red-600 ring-1 ring-red-300', inactive: 'bg-gray-50 text-gray-400' },
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">今日吃後感想</p>
        <Link href="/products" className="text-xs text-[#C4714A]">管理清單</Link>
      </div>
      <div className="divide-y divide-gray-50">
        {petProducts.map((pp) => {
          const reaction = dayReactions.find((r) => r.productId === pp.productId)
          const isSaving = reactionSaving === pp.productId
          return (
            <div key={pp.id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {pp.listType === 'trial' && (
                    <span className="text-[9px] bg-orange-100 text-[#FF8C42] px-1.5 py-0.5 rounded font-medium">試用</span>
                  )}
                  <span className="text-sm font-medium text-gray-800 truncate">{pp.product.name}</span>
                </div>
                {pp.listType === 'trial' && pp.trialReason && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">原因：{pp.trialReason}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-[#C4714A] rounded-full animate-spin" />
                ) : (
                  (Object.keys(RATING_CONFIG) as ('good' | 'ok' | 'bad')[]).map((r) => {
                    const cfg = RATING_CONFIG[r]
                    const isActive = reaction?.rating === r
                    return (
                      <button
                        key={r}
                        onClick={() => onRate(pp.productId, r)}
                        className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center transition-all ${isActive ? cfg.active : cfg.inactive}`}
                      >
                        {cfg.emoji}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Community Recs Panel ─────────────────────────────────────────────────────
function CommunityRecsPanel({
  recs, onDismiss,
}: {
  recs: CommunityRec[]
  onDismiss: (recId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  if (recs.length === 0) return null

  return (
    <div className="bg-gradient-to-br from-[#C4714A]/10 to-[#FFF5EF] rounded-2xl border border-[#C4714A]/20 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🌐</span>
          <span className="text-sm font-semibold text-gray-800">社群推薦</span>
          <span className="text-[10px] bg-[#C4714A] text-white px-1.5 py-0.5 rounded-full font-medium">{recs.length}</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {recs.map((rec) => (
            <div key={rec.id} className={`bg-white rounded-xl p-3 border ${rec.fromAI ? 'border-purple-100' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    {rec.fromAI ? (
                      <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">AI 建議</span>
                    ) : (
                      <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">社群推薦 · {rec.basedOnCount} 筆</span>
                    )}
                    <span className="text-[10px] text-gray-400">取代「{rec.badProduct.name}」</span>
                  </div>
                  {rec.fromAI ? (
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{rec.aiRationale}</p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-800">{rec.recommendedProduct.name}</p>
                  )}
                </div>
                <button onClick={() => onDismiss(rec.id)} className="text-gray-300 hover:text-gray-500 shrink-0 text-sm">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function LogPage() {
  const [pets, setPets]               = useState<Pet[]>([])
  const [currentPetId, setCurrentPetId] = useState('')
  const [usages, setUsages]           = useState<Usage[]>([])
  const [loading, setLoading]         = useState(true)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [editingUsageId, setEditingUsageId] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [petProducts, setPetProducts] = useState<PetProduct[]>([])
  const [dayReactions, setDayReactions] = useState<ProductReaction[]>([])
  const [reactionSaving, setReactionSaving] = useState<string | null>(null)
  const [communityRecs, setCommunityRecs] = useState<CommunityRec[]>([])

  useEffect(() => {
    fetch('/api/pets').then((r) => r.json()).then((data: Pet[]) => {
      setPets(data)
      if (data.length > 0) setCurrentPetId(data[0].id)
    }).catch(console.error)
  }, [])

  const loadUsages = useCallback(async (petId: string) => {
    if (!petId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/usages?petId=${petId}&limit=200`)
      const data = await res.json()
      setUsages(Array.isArray(data) ? data : [])
    } catch { setUsages([]) }
    finally { setLoading(false) }
  }, [])

  const loadPetProducts = useCallback(async (petId: string) => {
    try {
      const res = await fetch(`/api/pet-products?petId=${petId}`)
      const data = await res.json()
      setPetProducts(Array.isArray(data) ? data : [])
    } catch { setPetProducts([]) }
  }, [])

  const loadDayReactions = useCallback(async (petId: string, date: string) => {
    try {
      const res = await fetch(`/api/reactions?petId=${petId}&date=${date}`)
      const data = await res.json()
      setDayReactions(Array.isArray(data) ? data : [])
    } catch { setDayReactions([]) }
  }, [])

  const loadCommunityRecs = useCallback(async (petId: string) => {
    try {
      const res = await fetch(`/api/community/recs?petId=${petId}`)
      const data = await res.json()
      setCommunityRecs(Array.isArray(data) ? data : [])
    } catch { setCommunityRecs([]) }
  }, [])

  const saveReaction = async (productId: string, rating: string) => {
    if (!selectedDate || !currentPetId) return
    setReactionSaving(productId)
    // Optimistic update
    setDayReactions((prev) => {
      const exists = prev.find((r) => r.productId === productId)
      if (exists) return prev.map((r) => r.productId === productId ? { ...r, rating } : r)
      return [...prev, { id: 'tmp', productId, rating }]
    })
    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: currentPetId, productId, date: selectedDate, rating }),
      })
      await Promise.all([
        loadDayReactions(currentPetId, selectedDate),
        loadCommunityRecs(currentPetId),
      ])
    } catch { /* ignore — optimistic update already applied */ }
    finally { setReactionSaving(null) }
  }

  const dismissRec = async (recId: string) => {
    setCommunityRecs((prev) => prev.filter((r) => r.id !== recId))
    await fetch('/api/community/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recId }),
    })
  }

  useEffect(() => {
    if (currentPetId) {
      loadUsages(currentPetId)
      loadPetProducts(currentPetId)
      loadCommunityRecs(currentPetId)
    }
  }, [currentPetId, loadUsages, loadPetProducts, loadCommunityRecs])

  useEffect(() => {
    if (currentPetId && selectedDate) loadDayReactions(currentPetId, selectedDate)
  }, [currentPetId, selectedDate, loadDayReactions])

  const deleteUsage = async (id: string) => {
    if (!confirm('確定刪除此使用記錄？（產品資料不會刪除）')) return
    setDeletingId(id)
    try {
      await fetch(`/api/usages/${id}`, { method: 'DELETE' })
      setUsages((prev) => prev.filter((u) => u.id !== id))
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  // 依選取日期篩選
  const displayUsages = selectedDate
    ? usages.filter((u) => u.date.slice(0, 10) === selectedDate)
    : usages

  // Group by product type
  const grouped = displayUsages.reduce((acc, u) => {
    const t = u.product.type
    if (!acc[t]) acc[t] = []
    acc[t].push(u)
    return acc
  }, {} as Record<string, Usage[]>)

  const orderedGroups = TYPE_ORDER.filter((t) => grouped[t]).map((t) => ({ type: t, items: grouped[t] }))

  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const weekCount = usages.filter((u) => new Date(u.date) >= sevenDaysAgo).length

  const InlineHeader = () => (
    <div className="bg-white sticky top-0 z-10 border-b border-[#E8DDD5]">
      <div className="px-4 pt-10 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐾</span>
          <h1 className="text-lg font-bold text-[#2C1810]">健康日誌</h1>
        </div>
        <Link href="/log/new" className="text-sm text-[#C4714A] font-medium">新增</Link>
      </div>
    </div>
  )

  if (!loading && pets.length === 0) {
    return (
      <div>
        <InlineHeader />
        <div className="px-4 py-12 text-center">
          <p className="text-gray-500 mb-4">請先建立寵物檔案</p>
          <Link href="/pet/new" className="inline-block px-6 py-3 bg-[#C4714A] text-white rounded-xl font-medium text-sm">
            建立寵物檔案
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <InlineHeader />

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Pet selector */}
        {pets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pets.map((p) => (
              <button key={p.id} onClick={() => setCurrentPetId(p.id)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                  currentPetId === p.id ? 'bg-[#C4714A] text-white border-[#C4714A]' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {p.species === '狗' ? '🐕' : p.species === '貓' ? '🐈' : '🐾'} {p.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">載入中…</div>
        ) : usages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📖</div>
            <p className="text-gray-500 text-sm mb-4">尚無飲食記錄</p>
            <Link href="/log/new" className="inline-block px-6 py-3 bg-[#C4714A] text-white rounded-xl font-medium text-sm">
              新增第一筆記錄
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '總記錄', value: usages.length },
                { label: '種類', value: Object.keys(usages.reduce((a, u) => ({ ...a, [u.product.type]: true }), {})).length },
                { label: '本週', value: weekCount },
              ].map((s) => (
                <Card key={s.label} className="text-center">
                  <CardContent className="py-2">
                    <p className="text-xl font-bold text-[#C4714A]">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Community Recommendations */}
            <CommunityRecsPanel recs={communityRecs} onDismiss={dismissRec} />

            {/* Calendar */}
            <MonthCalendar
              usages={usages}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />

            {/* Selected date banner */}
            {selectedDate && (
              <div className="flex items-center gap-2 bg-[#FFF5EF] border border-[#F0D5C4] rounded-xl px-3 py-2">
                <span className="text-xs font-medium text-[#C4714A] flex-1">
                  📅 {selectedDate} · {displayUsages.length} 筆記錄
                </span>
                <Link
                  href={`/log/new?date=${selectedDate}`}
                  className="text-xs text-white bg-[#C4714A] px-2.5 py-1 rounded-lg font-medium shrink-0"
                >
                  + 新增此日
                </Link>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Daily reaction section — shown when a date is selected */}
            {selectedDate && (
              <DailyReactionSection
                petProducts={petProducts}
                dayReactions={dayReactions}
                reactionSaving={reactionSaving}
                onRate={saveReaction}
              />
            )}

            {/* 選取日期但無記錄 */}
            {selectedDate && displayUsages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-3">此日尚無記錄</p>
                <Link
                  href={`/log/new?date=${selectedDate}`}
                  className="inline-block px-5 py-2.5 bg-[#C4714A] text-white rounded-xl font-medium text-sm"
                >
                  新增此日記錄
                </Link>
              </div>
            )}

            {/* Grouped by type */}
            {orderedGroups.map(({ type, items }) => (
              <div key={type}>
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <span>{TYPE_EMOJIS[type]}</span>
                  <span>{productTypeLabel(type)}</span>
                  <span className="text-gray-400">({items.length})</span>
                </h3>
                <div className="space-y-2">
                  {items.map((usage) => (
                    <Card key={usage.id}>
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <span className="text-xl shrink-0">{TYPE_EMOJIS[type]}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-[#1a1a2e] truncate">{usage.product.name}</p>
                                {usage.product.brand && (
                                  <p className="text-xs text-gray-500">{usage.product.brand}</p>
                                )}
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                  <span className="text-xs text-gray-400">{formatDate(usage.date)}</span>
                                  {usage.frequency && <span className="text-xs text-gray-400">{usage.frequency}</span>}
                                  {usage.amountLevel && <span className="text-xs text-gray-400">用量：{usage.amountLevel}</span>}
                                </div>
                                {usage.notes && <p className="text-xs text-gray-500 mt-1">{usage.notes}</p>}
                              </div>
                              {/* Action buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                {/* Edit usage */}
                                <button
                                  title="編輯記錄"
                                  onClick={() => setEditingUsageId(editingUsageId === usage.id ? null : usage.id)}
                                  className={`p-1.5 rounded-lg transition-colors ${editingUsageId === usage.id ? 'bg-[#F0D5C4] text-[#C4714A]' : 'text-gray-300 hover:text-[#C4714A] hover:bg-[#FFF5EF]'}`}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </button>
                                {/* Edit ingredients */}
                                <button
                                  title="修改成分"
                                  onClick={() => setEditingProduct(usage.product)}
                                  className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                                    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
                                  </svg>
                                </button>
                                {/* Delete usage */}
                                <button
                                  title="刪除記錄"
                                  disabled={deletingId === usage.id}
                                  onClick={() => deleteUsage(usage.id)}
                                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Inline usage edit form */}
                            {editingUsageId === usage.id && (
                              <UsageEditForm
                                usage={usage}
                                onSaved={(updated) => {
                                  setUsages((prev) => prev.map((u) => u.id === usage.id ? { ...u, ...updated } : u))
                                  setEditingUsageId(null)
                                }}
                                onCancel={() => setEditingUsageId(null)}
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            <Link href="/log/new"
              className="block text-center py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm hover:border-[#C4714A] hover:text-[#C4714A] transition-colors">
              + 新增記錄
            </Link>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link href="/upload" className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-[#C4714A] transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#FF8C42] shrink-0">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span className="text-xs text-gray-600">上傳成分表</span>
              </Link>
              <Link href="/analysis" className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-[#C4714A] transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#C4714A] shrink-0">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
                </svg>
                <span className="text-xs text-gray-600">成分綜合分析</span>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Product edit modal */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={(updated) => {
            setUsages((prev) => prev.map((u) =>
              u.productId === updated.id ? { ...u, product: updated } : u
            ))
            setEditingProduct(null)
          }}
        />
      )}
    </div>
  )
}
