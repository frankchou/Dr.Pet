'use client'

import { useState, useEffect, useCallback } from 'react'
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

  // Add-to-list modal state
  const [showAdd, setShowAdd] = useState(false)
  const [addListType, setAddListType] = useState<'fixed' | 'trial'>('fixed')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [trialReason, setTrialReason] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit trial reason inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editReason, setEditReason] = useState('')

  useEffect(() => {
    fetch('/api/pets').then(r => r.json()).then((data: Pet[]) => {
      setPets(data)
      const stored = localStorage.getItem('drpet_currentPetId')
      const first = stored && data.find(p => p.id === stored) ? stored : data[0]?.id
      if (first) setCurrentPetId(first)
    })
  }, [])

  const loadItems = useCallback(async (petId: string) => {
    if (!petId) return
    setLoading(true)
    const res = await fetch(`/api/pet-products?petId=${petId}`)
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (currentPetId) {
      loadItems(currentPetId)
      localStorage.setItem('drpet_currentPetId', currentPetId)
    }
  }, [currentPetId, loadItems])

  // Search products
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/products?search=${encodeURIComponent(searchQ)}`)
      setSearchResults(await res.json())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQ])

  const openAdd = (lt: 'fixed' | 'trial') => {
    setAddListType(lt)
    setSearchQ('')
    setSearchResults([])
    setSelectedProduct(null)
    setTrialReason('')
    setShowAdd(true)
  }

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

  const handleMoveList = async (item: PetProduct, newType: 'fixed' | 'trial') => {
    await fetch(`/api/pet-products/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listType: newType, trialReason: newType === 'trial' ? '' : null }),
    })
    loadItems(currentPetId)
    setTab(newType)
  }

  const handleRemove = async (id: string) => {
    await fetch(`/api/pet-products/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

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
    <div className="min-h-screen bg-[#F8F9FF]">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
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
              <button
                key={p.id}
                onClick={() => setCurrentPetId(p.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  currentPetId === p.id
                    ? 'bg-[#4F7CFF] text-white border-[#4F7CFF]'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                <span>{SPECIES_EMOJI[p.species] || '🐾'}</span>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        {/* Tabs */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-4">
          {(['fixed', 'trial'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-[#4F7CFF] text-white' : 'text-gray-500'
              }`}
            >
              {t === 'fixed' ? '🏠 固定清單' : '🧪 試用清單'}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {items.filter(i => i.listType === t).length}
              </span>
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p className="text-xs text-gray-400 mb-3 px-1">
          {tab === 'fixed'
            ? `${currentPet?.name || '寵物'} 每天固定食用的產品清單`
            : `${currentPet?.name || '寵物'} 正在嘗試的新產品，可記錄試用原因`}
        </p>

        {/* List */}
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">載入中…</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">{tab === 'fixed' ? '🛒' : '🔬'}</div>
            <p className="text-sm">{tab === 'fixed' ? '尚未新增固定產品' : '目前沒有試用中的產品'}</p>
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
                      <span className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</span>
                    </div>
                    {item.product.brand && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.product.brand}</p>
                    )}
                    {tab === 'trial' && (
                      <div className="mt-1.5">
                        {editingId === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              value={editReason}
                              onChange={e => setEditReason(e.target.value)}
                              placeholder="試用原因…"
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4F7CFF]/40"
                            />
                            <button onClick={() => handleSaveReason(item.id)} className="text-xs text-[#4F7CFF] font-medium">儲存</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">取消</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(item.id); setEditReason(item.trialReason || '') }}
                            className="text-xs text-gray-500 flex items-center gap-1"
                          >
                            <span className="text-[10px] text-[#FF8C42]">試用原因：</span>
                            <span className={item.trialReason ? 'text-gray-600' : 'text-gray-300'}>
                              {item.trialReason || '點擊新增原因 ✏️'}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {tab === 'fixed' ? (
                      <button
                        onClick={() => handleMoveList(item, 'trial')}
                        className="text-[10px] text-[#4F7CFF] bg-blue-50 px-2 py-1 rounded-lg whitespace-nowrap"
                      >
                        移至試用
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMoveList(item, 'fixed')}
                        className="text-[10px] text-green-700 bg-green-50 px-2 py-1 rounded-lg whitespace-nowrap"
                      >
                        移至固定
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-[10px] text-red-400 bg-red-50 px-2 py-1 rounded-lg"
                    >
                      移除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => openAdd(tab)}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#4F7CFF]/30 text-[#4F7CFF] rounded-2xl text-sm font-medium hover:bg-[#4F7CFF]/5 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          新增{tab === 'fixed' ? '固定' : '試用'}產品
        </button>
      </div>

      {/* Add product modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl px-4 pt-5 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">
                新增至{addListType === 'fixed' ? '固定' : '試用'}清單
              </h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            {/* Search */}
            {!selectedProduct ? (
              <>
                <input
                  type="text"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="搜尋產品名稱或品牌…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40 mb-3"
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="space-y-1.5">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setSearchQ('') }}
                        className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-blue-50 rounded-xl text-sm flex items-center gap-2 transition-colors"
                      >
                        <span className="text-[10px] bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">
                          {productTypeLabel(p.type)}
                        </span>
                        <span className="font-medium text-gray-800">{p.name}</span>
                        {p.brand && <span className="text-gray-400 text-xs">{p.brand}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {searchQ && searchResults.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-3">找不到產品，請先在日誌中新增</p>
                )}
              </>
            ) : (
              <>
                {/* Selected product confirmation */}
                <div className="bg-blue-50 rounded-xl px-3 py-2.5 flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{selectedProduct.name}</p>
                    {selectedProduct.brand && <p className="text-xs text-gray-500">{selectedProduct.brand}</p>}
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-xs text-gray-400">更換</button>
                </div>

                {addListType === 'trial' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">試用原因（選填）</label>
                    <input
                      type="text"
                      value={trialReason}
                      onChange={e => setTrialReason(e.target.value)}
                      placeholder="例：想改善皮膚問題、獸醫建議嘗試…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40"
                    />
                  </div>
                )}

                <button
                  onClick={handleAddToList}
                  disabled={saving}
                  className="w-full bg-[#4F7CFF] text-white rounded-xl py-3 font-medium text-sm disabled:opacity-60"
                >
                  {saving ? '新增中…' : `加入${addListType === 'fixed' ? '固定' : '試用'}清單`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
