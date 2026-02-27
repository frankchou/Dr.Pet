'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { productTypeLabel } from '@/lib/utils'

interface Product {
  id: string
  type: string
  name: string
  brand?: string | null
  variant?: string | null
}

interface PetProduct {
  id: string
  petId: string
  productId: string
  listType: string   // 'fixed' | 'trial'
  trialReason?: string | null
  product: Product
}

interface Pet {
  id: string
  name: string
  species: string
  avatar?: string | null
}

const SPECIES_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱' }

export default function ProductsPage() {
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [currentPetId, setCurrentPetId] = useState<string>('')
  const [items, setItems] = useState<PetProduct[]>([])
  const [tab, setTab] = useState<'fixed' | 'trial'>('fixed')
  const [loading, setLoading] = useState(false)

  // Products this pet has used (from log history) — shown first in modal
  const [petUsedProducts, setPetUsedProducts] = useState<Product[]>([])
  // All products in DB — loaded lazily when modal first opens
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [allProductsLoaded, setAllProductsLoaded] = useState(false)

  // Add modal state
  const [showAdd, setShowAdd] = useState(false)
  const [addListType, setAddListType] = useState<'fixed' | 'trial'>('fixed')
  const [searchQ, setSearchQ] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [trialReason, setTrialReason] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit trial reason inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editReason, setEditReason] = useState('')

  // ── Load pets ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/pets').then(r => r.json()).then((data: Pet[]) => {
      setPets(data)
      const stored = localStorage.getItem('drpet_currentPetId')
      const first = stored && data.find(p => p.id === stored) ? stored : data[0]?.id
      if (first) setCurrentPetId(first)
    })
  }, [])

  // ── Load pet's product list ───────────────────────────────────────────────────
  const loadItems = useCallback(async (petId: string) => {
    if (!petId) return
    setLoading(true)
    const res = await fetch(`/api/pet-products?petId=${petId}`)
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [])

  // ── Load all products this pet has ever used (for modal browsing) ─────────────
  const loadPetUsedProducts = useCallback(async (petId: string) => {
    if (!petId) return
    const res = await fetch(`/api/usages?petId=${petId}&limit=200`)
    const usages: { productId: string; product: Product }[] = await res.json()
    const seen = new Set<string>()
    const unique: Product[] = []
    for (const u of usages) {
      if (!seen.has(u.productId)) {
        seen.add(u.productId)
        unique.push(u.product)
      }
    }
    setPetUsedProducts(unique)
  }, [])

  useEffect(() => {
    if (currentPetId) {
      loadItems(currentPetId)
      loadPetUsedProducts(currentPetId)
      localStorage.setItem('drpet_currentPetId', currentPetId)
    }
  }, [currentPetId, loadItems, loadPetUsedProducts])

  // ── Modal product list: petUsedProducts first, then all others ───────────────
  const usedProductIds = useMemo(() => new Set(petUsedProducts.map(p => p.id)), [petUsedProducts])

  const modalProducts = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    const others = allProducts.filter(p => !usedProductIds.has(p.id))
    const combined = [...petUsedProducts, ...others]
    if (!q) return combined
    return combined.filter(p =>
      p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
    )
  }, [petUsedProducts, allProducts, usedProductIds, searchQ])

  // Map productId → listType for products already in the list
  const inListMap = useMemo(() => {
    const m: Record<string, 'fixed' | 'trial'> = {}
    for (const it of items) m[it.productId] = it.listType as 'fixed' | 'trial'
    return m
  }, [items])

  // ── Open modal (lazy-load all products on first open) ────────────────────────
  const openAdd = (lt: 'fixed' | 'trial') => {
    setAddListType(lt)
    setSearchQ('')
    setSelectedProduct(null)
    setTrialReason('')
    setShowAdd(true)
    if (!allProductsLoaded) {
      fetch('/api/products')
        .then(r => r.json())
        .then((data: Product[]) => { setAllProducts(data); setAllProductsLoaded(true) })
        .catch(() => {})
    }
  }

  // ── Add to list ───────────────────────────────────────────────────────────────
  const handleAddToList = async () => {
    if (!selectedProduct) return
    setSaving(true)
    await fetch('/api/pet-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petId: currentPetId,
        productId: selectedProduct.id,
        listType: addListType,
        trialReason: addListType === 'trial' ? trialReason : null,
      }),
    })
    setSaving(false)
    setShowAdd(false)
    loadItems(currentPetId)
  }

  // ── Move between lists ────────────────────────────────────────────────────────
  const handleMoveList = async (item: PetProduct, newType: 'fixed' | 'trial') => {
    await fetch(`/api/pet-products/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listType: newType, trialReason: newType === 'trial' ? '' : null }),
    })
    loadItems(currentPetId)
    setTab(newType)
  }

  // ── Remove ────────────────────────────────────────────────────────────────────
  const handleRemove = async (id: string) => {
    await fetch(`/api/pet-products/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  // ── Save trial reason ─────────────────────────────────────────────────────────
  const handleSaveReason = async (id: string) => {
    await fetch(`/api/pet-products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trialReason: editReason }),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, trialReason: editReason } : i))
    setEditingId(null)
  }

  const currentPet = pets.find(p => p.id === currentPetId)
  const displayed = items.filter(i => i.listType === tab)

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-36">
      {/* ── Sticky header ── */}
      <div className="bg-white px-4 pt-12 pb-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">產品清單管理</h1>
        </div>

        {/* Pet selector */}
        {pets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pets.map(p => (
              <button key={p.id} onClick={() => setCurrentPetId(p.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  currentPetId === p.id ? 'bg-[#4F7CFF] text-white border-[#4F7CFF]' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                <span>{SPECIES_EMOJI[p.species] || '🐾'}</span>
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mt-3">
          {(['fixed', 'trial'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-[#4F7CFF] shadow-sm' : 'text-gray-500'
              }`}>
              {t === 'fixed' ? '🏠 固定清單' : '🧪 試用清單'}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t ? 'bg-[#4F7CFF]/10 text-[#4F7CFF]' : 'bg-gray-200 text-gray-500'
              }`}>
                {items.filter(i => i.listType === t).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div className="px-4 py-3">
        <p className="text-xs text-gray-400 mb-3 px-1">
          {tab === 'fixed'
            ? `${currentPet?.name || '寵物'} 每天固定食用的產品`
            : `${currentPet?.name || '寵物'} 正在嘗試的新產品`}
        </p>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">載入中…</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">{tab === 'fixed' ? '🛒' : '🔬'}</div>
            <p className="text-sm">{tab === 'fixed' ? '尚未新增固定產品' : '目前沒有試用中的產品'}</p>
            <p className="text-xs text-gray-300 mt-1">點擊下方按鈕新增</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {productTypeLabel(item.product.type)}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{item.product.name}</span>
                    </div>
                    {item.product.brand && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.product.brand}</p>
                    )}
                    {tab === 'trial' && (
                      <div className="mt-2">
                        {editingId === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <input value={editReason} onChange={e => setEditReason(e.target.value)}
                              placeholder="試用原因…"
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F7CFF]/40" />
                            <button onClick={() => handleSaveReason(item.id)} className="text-xs text-[#4F7CFF] font-medium px-2 py-1 bg-blue-50 rounded-lg">儲存</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">取消</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingId(item.id); setEditReason(item.trialReason || '') }}
                            className="flex items-start gap-1 text-left w-full">
                            <span className="text-[10px] text-[#FF8C42] font-medium shrink-0 mt-0.5">試用原因</span>
                            <span className={`text-xs ${item.trialReason ? 'text-gray-600' : 'text-gray-300'}`}>
                              {item.trialReason || '點擊新增原因 ✏️'}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {tab === 'fixed' ? (
                      <button onClick={() => handleMoveList(item, 'trial')}
                        className="text-[10px] text-[#4F7CFF] bg-blue-50 px-2 py-1 rounded-lg whitespace-nowrap">
                        → 試用清單
                      </button>
                    ) : (
                      <button onClick={() => handleMoveList(item, 'fixed')}
                        className="text-[10px] text-green-700 bg-green-50 px-2 py-1 rounded-lg whitespace-nowrap">
                        → 固定清單
                      </button>
                    )}
                    <button onClick={() => handleRemove(item.id)}
                      className="text-[10px] text-red-400 bg-red-50 px-2 py-1 rounded-lg">
                      移除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sticky add button (above bottom nav) ── */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[calc(480px-2rem)] z-20">
        <button onClick={() => openAdd(tab)}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#4F7CFF] text-white rounded-2xl font-medium text-sm shadow-lg active:opacity-90 transition-opacity">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          新增{tab === 'fixed' ? '固定' : '試用'}產品
        </button>
      </div>

      {/* ── Add product modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl flex flex-col"
            style={{ maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header — fixed */}
            <div className="px-4 pt-5 pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800">
                  {addListType === 'fixed' ? '🏠 新增固定產品' : '🧪 新增試用產品'}
                </h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl leading-none w-7 h-7 flex items-center justify-center">✕</button>
              </div>

              {/* Search bar — always visible */}
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="搜尋產品名稱或品牌…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40"
                autoFocus
              />
            </div>

            {/* ── Step: select product ── */}
            {!selectedProduct ? (
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {modalProducts.length === 0 && searchQ.trim() ? (
                  <div className="text-center py-8 text-gray-400 text-sm">找不到相符產品</div>
                ) : (
                  <div className="py-1">
                    {modalProducts.map((p, idx) => {
                      const isUsed = usedProductIds.has(p.id)
                      const prevIsUsed = idx > 0 && usedProductIds.has(modalProducts[idx - 1].id)
                      const q = searchQ.trim()
                      // Section headers (only when not searching)
                      const showUsedHeader = !q && isUsed && idx === 0 && petUsedProducts.length > 0
                      const showAllHeader = !q && !isUsed && (idx === 0 || prevIsUsed)

                      const status = inListMap[p.id]
                      const alreadyHere = status === addListType
                      const inOther = status && status !== addListType
                      return (
                        <div key={p.id}>
                          {showUsedHeader && (
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 pt-1 pb-1.5">曾使用</p>
                          )}
                          {showAllHeader && (
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 pt-3 pb-1.5">所有產品</p>
                          )}
                          <button
                            disabled={alreadyHere}
                            onClick={() => { if (!alreadyHere) setSelectedProduct(p) }}
                            className={`w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-colors mb-1.5 ${
                              alreadyHere
                                ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                                : 'bg-gray-50 hover:bg-blue-50 active:bg-blue-100'
                            }`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-100 shrink-0">
                                  {productTypeLabel(p.type)}
                                </span>
                                <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                              </div>
                              {p.brand && <p className="text-xs text-gray-400 mt-0.5">{p.brand}</p>}
                            </div>
                            {alreadyHere && (
                              <span className="text-[10px] bg-[#4F7CFF]/10 text-[#4F7CFF] px-1.5 py-0.5 rounded shrink-0">已在清單</span>
                            )}
                            {inOther && (
                              <span className="text-[10px] bg-orange-50 text-[#FF8C42] px-1.5 py-0.5 rounded shrink-0">
                                在{status === 'fixed' ? '固定' : '試用'}清單
                              </span>
                            )}
                            {!status && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                                className="w-4 h-4 text-gray-300 shrink-0">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ── Step: confirm + (trial reason) ── */
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Selected product card */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-100">
                        {productTypeLabel(selectedProduct.type)}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{selectedProduct.name}</span>
                    </div>
                    {selectedProduct.brand && <p className="text-xs text-gray-500 mt-0.5">{selectedProduct.brand}</p>}
                  </div>
                  <button onClick={() => setSelectedProduct(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 shrink-0 ml-2 underline">
                    更換
                  </button>
                </div>

                {/* Trial reason input */}
                {addListType === 'trial' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      試用原因 <span className="text-gray-400 font-normal text-xs">（選填）</span>
                    </label>
                    <input type="text" value={trialReason}
                      onChange={e => setTrialReason(e.target.value)}
                      placeholder="例：想改善皮膚問題、獸醫建議嘗試此配方…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40"
                      autoFocus
                    />
                  </div>
                )}

                <button onClick={handleAddToList} disabled={saving}
                  className="w-full bg-[#4F7CFF] text-white rounded-xl py-3.5 font-medium text-sm disabled:opacity-60 active:opacity-90 transition-opacity">
                  {saving ? '新增中…' : `加入${addListType === 'fixed' ? '固定' : '試用'}清單`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
