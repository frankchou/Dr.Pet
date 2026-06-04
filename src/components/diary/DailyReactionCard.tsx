'use client'

// 每日「吃後感想」評分卡片：對使用中產品逐項記錄好 / 一般 / 不好。
// 沿用 /api/reactions（@@unique[petId, productId, date]）與 /api/pet-products，
// 原本只存在於已下架的 /log 頁，現接進新版日誌 /diary。

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  brand?: string | null
}

interface PetProduct {
  id: string
  listType: string
  trialReason?: string | null
  productId: string
  product: Product
}

interface ProductReaction {
  id: string
  productId: string
  rating: string
  notes?: string | null
}

type Rating = 'good' | 'ok' | 'bad'

const RATING_CONFIG: Record<Rating, { emoji: string; active: string; inactive: string }> = {
  good: { emoji: '👍', active: 'bg-green-100 text-green-700 ring-1 ring-green-300', inactive: 'bg-slate-50 text-slate-400' },
  ok:   { emoji: '😐', active: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300', inactive: 'bg-slate-50 text-slate-400' },
  bad:  { emoji: '👎', active: 'bg-red-100 text-red-600 ring-1 ring-red-300', inactive: 'bg-slate-50 text-slate-400' },
}

interface Props {
  petId: string
  // date 為 YYYY-MM-DD，與 /api/reactions 的精確字串比對一致
  date: string
}

export default function DailyReactionCard({ petId, date }: Props) {
  const [petProducts, setPetProducts] = useState<PetProduct[]>([])
  const [reactions, setReactions] = useState<ProductReaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const loadReactions = useCallback(async () => {
    if (!petId || !date) return
    try {
      const res = await fetch(`/api/reactions?petId=${petId}&date=${date}`)
      const data = await res.json()
      setReactions(Array.isArray(data) ? data : [])
    } catch {
      setReactions([])
    }
  }, [petId, date])

  useEffect(() => {
    if (!petId) {
      setPetProducts([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    Promise.all([
      fetch(`/api/pet-products?petId=${petId}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/reactions?petId=${petId}&date=${date}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([pp, rx]) => {
        if (!active) return
        setPetProducts(Array.isArray(pp) ? pp : [])
        setReactions(Array.isArray(rx) ? rx : [])
      })
      .catch(() => {
        if (!active) return
        setPetProducts([])
        setReactions([])
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [petId, date])

  const rate = async (productId: string, rating: Rating) => {
    if (!petId || !date) return
    setSaving(productId)
    // 樂觀更新
    setReactions((prev) => {
      const exists = prev.find((r) => r.productId === productId)
      if (exists) return prev.map((r) => (r.productId === productId ? { ...r, rating } : r))
      return [...prev, { id: 'tmp', productId, rating }]
    })
    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, productId, date, rating }),
      })
      await loadReactions()
    } catch {
      /* 已套用樂觀更新，靜默 */
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#2C1810]">今日吃後感想</h3>
        <Link href="/products" className="text-xs text-[#C4714A] font-medium">管理清單</Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-[#C4714A] rounded-full animate-spin" />
        </div>
      ) : petProducts.length === 0 ? (
        <p className="text-xs text-slate-400">
          尚未建立產品清單，
          <Link href="/products" className="text-[#C4714A] underline underline-offset-2">前往新增</Link>
        </p>
      ) : (
        <div className="space-y-2">
          {petProducts.map((pp) => {
            const reaction = reactions.find((r) => r.productId === pp.productId)
            const isSaving = saving === pp.productId
            return (
              <div key={pp.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-2xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pp.listType === 'trial' && (
                      <span className="text-[9px] bg-orange-100 text-[#FF8C42] px-1.5 py-0.5 rounded font-medium">試用</span>
                    )}
                    <span className="text-sm font-medium text-slate-800 truncate">{pp.product.name}</span>
                  </div>
                  {pp.product.brand && (
                    <p className="text-[11px] text-slate-400 truncate">{pp.product.brand}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-slate-200 border-t-[#C4714A] rounded-full animate-spin" />
                  ) : (
                    (Object.keys(RATING_CONFIG) as Rating[]).map((r) => {
                      const cfg = RATING_CONFIG[r]
                      const isActive = reaction?.rating === r
                      return (
                        <button
                          key={r}
                          onClick={() => rate(pp.productId, r)}
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
      )}
    </div>
  )
}
