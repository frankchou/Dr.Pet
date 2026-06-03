'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { parseJson, productTypeLabel } from '@/lib/utils'

interface Pet {
  id: string
  name: string
  species: string
  breed?: string | null
  gender?: string | null
  weight?: number | null
  age?: number | null
  avatar?: string | null
  mainProblems?: string | null
  allergies?: string | null
}

interface PetProduct {
  id: string
  listType: string
  createdAt: string
  product: { id: string; type: string; name: string; brand?: string | null }
}

const TYPE_LABEL: Record<string, string> = {
  feed: '飼', can: '罐', snack: '零', supplement: '保', dental: '潔', shampoo: '浴', other: '他',
}
const TYPE_BG: Record<string, string> = {
  feed: 'bg-[#F5EDE6]', can: 'bg-[#FDF3E7]', snack: 'bg-[#FFF8F0]',
  supplement: 'bg-[#EDF5ED]', dental: 'bg-[#EDF3F5]', shampoo: 'bg-[#F5EDF5]', other: 'bg-[#F0F0F0]',
}

export default function HomePage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [currentPetId, setCurrentPetId] = useState('')
  const [petProducts, setPetProducts] = useState<PetProduct[]>([])
  const [productTab, setProductTab] = useState<'fixed' | 'trial'>('fixed')
  const [nickname, setNickname] = useState('飼主')
  const [loading, setLoading] = useState(true)
  const [deletingPet, setDeletingPet] = useState(false)
  const [heroView, setHeroView] = useState<'compact' | 'large'>('compact')
  const [todayStr, setTodayStr] = useState('')

  const [showEditOwner, setShowEditOwner] = useState(false)
  const [editNickname, setEditNickname] = useState('')

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const stored = localStorage.getItem('drpet_nickname')
    if (stored) setNickname(stored)
  }, [])

  useEffect(() => {
    const now = new Date()
    setTodayStr(`今天 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)
  }, [])

  useEffect(() => {
    fetch('/api/pets')
      .then(r => r.json())
      .then((data: Pet[]) => {
        setPets(data)
        const stored = localStorage.getItem('drpet_currentPetId')
        const first = stored && data.find(p => p.id === stored) ? stored : data[0]?.id
        if (first) setCurrentPetId(first)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadProducts = useCallback(async (petId: string) => {
    if (!petId) return
    try {
      const res = await fetch(`/api/pet-products?petId=${petId}`)
      const data = await res.json()
      setPetProducts(Array.isArray(data) ? data : [])
    } catch { setPetProducts([]) }
  }, [])

  useEffect(() => {
    if (currentPetId) {
      localStorage.setItem('drpet_currentPetId', currentPetId)
      loadProducts(currentPetId)
    }
  }, [currentPetId, loadProducts])

  const currentPetIndex = pets.findIndex(p => p.id === currentPetId)
  const currentPet = pets[currentPetIndex] ?? null

  const goPrev = () => {
    if (pets.length <= 1) return
    setCurrentPetId(pets[(currentPetIndex - 1 + pets.length) % pets.length].id)
  }
  const goNext = () => {
    if (pets.length <= 1) return
    setCurrentPetId(pets[(currentPetIndex + 1) % pets.length].id)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (Math.abs(dx) > 50 && dy < 60) dx > 0 ? goNext() : goPrev()
  }

  const handleDeletePet = async () => {
    if (!currentPet) return
    if (!confirm(`確定要刪除「${currentPet.name}」的所有資料？此操作無法復原。`)) return
    setDeletingPet(true)
    try {
      await fetch(`/api/pets/${currentPetId}`, { method: 'DELETE' })
      const newPets = pets.filter(p => p.id !== currentPetId)
      setPets(newPets)
      setCurrentPetId(newPets[0]?.id || '')
      setPetProducts([])
    } catch { /* ignore */ }
    finally { setDeletingPet(false) }
  }

  const mainProblems = parseJson<string[]>(currentPet?.mainProblems || '[]', [])
  const allergies    = parseJson<string[]>(currentPet?.allergies   || '[]', [])
  const allTags      = [...mainProblems, ...allergies]
  const fixedProducts   = petProducts.filter(p => p.listType === 'fixed')
  const trialProducts   = petProducts.filter(p => p.listType === 'trial')
  const displayProducts = productTab === 'fixed' ? fixedProducts : trialProducts

  const saveOwnerName = () => {
    const name = editNickname.trim()
    if (!name) return
    setNickname(name)
    localStorage.setItem('drpet_nickname', name)
    setShowEditOwner(false)
  }

  // ── Avatar element (reused in both layouts) ─────────────────────────────────
  const AvatarEl = ({ size }: { size: 'sm' | 'lg' }) => {
    const dim = size === 'sm' ? 'w-20 h-20 rounded-2xl' : 'w-28 h-28 rounded-3xl'
    const iconSize = size === 'sm' ? 'w-9 h-9' : 'w-12 h-12'
    const badgePos = size === 'sm' ? '-bottom-2 -right-2 w-7 h-7' : '-bottom-2 -right-2 w-8 h-8'
    return (
      <div className={`${dim} bg-white shadow-sm flex items-center justify-center relative shrink-0`}>
        {currentPet?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentPet.avatar} alt={currentPet?.name} className="w-full h-full object-cover rounded-[inherit]" />
        ) : (
          <svg viewBox="0 0 24 24" fill="#C4714A" className={`${iconSize} opacity-70`}>
            <ellipse cx="12" cy="17" rx="5" ry="3.5" />
            <circle cx="8.5" cy="11" r="1.8" />
            <circle cx="15.5" cy="11" r="1.8" />
            <circle cx="5.5" cy="13.5" r="1.4" />
            <circle cx="18.5" cy="13.5" r="1.4" />
          </svg>
        )}
        <div className={`absolute ${badgePos} rounded-full bg-[#C4714A] flex items-center justify-center shadow-sm`}>
          <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24">

      {/* ── Header ── */}
      <div className="bg-[#FAF7F2] px-4 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#2C1810]">毛孩檔案</h1>
            <p className="text-xs text-[#8B7355] mt-0.5">上次更新：{todayStr}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5EDE6] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="#C4714A" className="w-6 h-6">
              <ellipse cx="12" cy="17" rx="5" ry="3.5" />
              <circle cx="8.5" cy="11" r="1.8" />
              <circle cx="15.5" cy="11" r="1.8" />
              <circle cx="5.5" cy="13.5" r="1.4" />
              <circle cx="18.5" cy="13.5" r="1.4" />
            </svg>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 pt-2">

        {/* ── Owner card ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C4714A] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {nickname.slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#8B7355]">Hi, 歡迎回來</p>
            <p className="text-sm font-semibold text-[#2C1810] truncate">{nickname}</p>
          </div>
          {/* Edit nickname */}
          <button onClick={() => { setEditNickname(nickname); setShowEditOwner(true) }}
            className="w-7 h-7 flex items-center justify-center text-[#8B7355] hover:text-[#C4714A]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {/* Toggle hero view (compact ↔ large) */}
          <button onClick={() => setHeroView(v => v === 'compact' ? 'large' : 'compact')}
            className="w-7 h-7 flex items-center justify-center text-[#8B7355] hover:text-[#C4714A]">
            {heroView === 'compact' ? (
              /* Grid icon → indicates compact mode */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            ) : (
              /* Detail icon → indicates large mode */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                <rect x="3" y="4" width="6" height="6" rx="1" />
                <line x1="12" y1="7" x2="21" y2="7" strokeLinecap="round" />
                <rect x="3" y="14" width="6" height="6" rx="1" />
                <line x1="12" y1="17" x2="21" y2="17" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* ── Pet hero card ── */}
        {loading ? (
          <div className="bg-white rounded-3xl shadow-sm h-52 animate-pulse" />
        ) : !currentPet ? (
          <div className="bg-white rounded-3xl shadow-sm py-12 flex flex-col items-center gap-3">
            <div className="text-5xl">🐾</div>
            <p className="text-[#8B7355] text-sm">先建立您的毛孩檔案</p>
            <Link href="/pet/new"
              className="px-6 py-2.5 bg-[#C4714A] text-white rounded-2xl font-medium text-sm">
              建立毛孩檔案
            </Link>
          </div>
        ) : (
          <div className="relative">

            {/* Right: Next pet */}
            {pets.length > 1 && (
              <button onClick={goNext}
                className="absolute right-0 top-0 bottom-0 w-10 z-10 flex items-center justify-center group">
                <div className="w-7 h-14 rounded-l-2xl bg-[#EDE0D8]/60 group-active:bg-[#C4714A]/20 flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} className="w-4 h-4">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            )}

            {/* Hero card */}
            <div className={`bg-white rounded-3xl shadow-sm overflow-hidden ${pets.length > 1 ? 'mr-9' : ''}`}
              onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

              {heroView === 'compact' ? (
                /* ── Compact: avatar left, info right ── */
                <div className="bg-[#F5EDE6] px-4 py-5 flex items-center gap-4 relative">
                  <Link href={`/pet/${currentPetId}`}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#8B7355]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </Link>
                  <AvatarEl size="sm" />
                  <div className="flex-1 min-w-0 pr-8">
                    {/* Name + gender + delete inline */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-xl font-bold text-[#2C1810]">{currentPet.name}</h2>
                      {currentPet.gender && (
                        <span className="text-xs text-[#C4714A] border border-[#C4714A]/40 rounded-full px-2 py-0.5 leading-none shrink-0">
                          {currentPet.gender}
                        </span>
                      )}
                      <button onClick={handleDeletePet} disabled={deletingPet}
                        className="shrink-0 w-6 h-6 flex items-center justify-center text-[#C4714A]/40 hover:text-red-400 active:text-red-500 disabled:opacity-40 transition-colors">
                        {deletingPet ? (
                          <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-[#8B7355] mt-0.5">
                      {currentPet.breed || currentPet.species}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[#8B7355] mt-0.5">
                      {currentPet.weight && <span>{currentPet.weight} 公斤</span>}
                      {currentPet.weight && currentPet.age && <span className="text-[#C4714A]/40">｜</span>}
                      {currentPet.age && <span>{currentPet.age} 歲</span>}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Large: avatar centered, tall ── */
                <div className="bg-[#F5EDE6] px-4 pt-8 pb-5 flex flex-col items-center relative">
                  <Link href={`/pet/${currentPetId}`}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#8B7355]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </Link>
                  <AvatarEl size="lg" />
                  {/* Name + gender + delete inline */}
                  <div className="flex items-center gap-1.5 mt-4 flex-wrap justify-center">
                    <h2 className="text-2xl font-bold text-[#2C1810]">{currentPet.name}</h2>
                    {currentPet.gender && (
                      <span className="text-xs text-[#C4714A] border border-[#C4714A]/40 rounded-full px-2 py-0.5 leading-none shrink-0">
                        {currentPet.gender}
                      </span>
                    )}
                    <button onClick={handleDeletePet} disabled={deletingPet}
                      className="shrink-0 w-6 h-6 flex items-center justify-center text-[#C4714A]/40 hover:text-red-400 active:text-red-500 disabled:opacity-40 transition-colors">
                      {deletingPet ? (
                        <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-0.5">
                    {currentPet.breed || currentPet.species}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-[#8B7355] mt-0.5">
                    {currentPet.weight && <span>{currentPet.weight} 公斤</span>}
                    {currentPet.weight && currentPet.age && <span className="text-[#C4714A]/40">｜</span>}
                    {currentPet.age && <span>{currentPet.age} 歲</span>}
                  </div>
                </div>
              )}

              {/* Health tags (same for both views) */}
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-[#C4714A]/40 text-[#C4714A] bg-[#FDF8F5]">
                      # {tag}
                    </span>
                  ))}
                  {[80, 48, 64, 56, 40].map((w, i) => (
                    <span key={`sk-${i}`} className="h-6 rounded-full bg-[#EDE0D8]/30" style={{ width: w }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Pet index dots */}
            {pets.length > 1 && (
              <div className="flex gap-1.5 justify-center pt-2.5">
                {pets.map((p, i) => (
                  <button key={p.id} onClick={() => setCurrentPetId(p.id)}
                    className={`rounded-full transition-all ${
                      i === currentPetIndex ? 'w-4 h-1.5 bg-[#C4714A]' : 'w-1.5 h-1.5 bg-[#C4714A]/30'
                    }`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 健康狀況 ── */}
        {!loading && (
          <div>
            <p className="text-sm font-bold text-[#2C1810] mb-2">健康狀況</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={1.8} className="w-5 h-5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, label: '體態評分' },
                { icon: <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={1.8} className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label: '活力指數' },
                { icon: <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={1.8} className="w-5 h-5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>, label: '水分攝取' },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-3 flex flex-col items-center gap-1.5 text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#F5EDE6] flex items-center justify-center">{card.icon}</div>
                  <p className="text-sm font-bold text-[#2C1810]">未記錄</p>
                  <p className="text-[10px] text-[#8B7355] leading-tight">{card.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 使用產品 ── */}
        {!loading && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-[#2C1810]">使用產品</p>
              <div className="flex rounded-full bg-[#F0EAE4] p-0.5">
                {(['fixed', 'trial'] as const).map(t => (
                  <button key={t} onClick={() => setProductTab(t)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                      productTab === t ? 'bg-white text-[#C4714A] shadow-sm' : 'text-[#8B7355]'
                    }`}>
                    {t === 'fixed' ? '固定' : '試用'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {displayProducts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm py-8 text-center text-[#8B7355] text-sm">
                  尚無{productTab === 'fixed' ? '固定' : '試用'}產品
                </div>
              ) : displayProducts.map(pp => (
                <Link key={pp.id} href="/products"
                  className="bg-white rounded-2xl shadow-sm p-3.5 flex items-center gap-3 active:opacity-80 block">
                  <div className={`w-10 h-10 rounded-xl ${TYPE_BG[pp.product.type] || 'bg-[#F5EDE6]'} flex items-center justify-center shrink-0`}>
                    <span className="text-xs font-bold text-[#C4714A]">{TYPE_LABEL[pp.product.type] || '他'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2C1810] truncate">{pp.product.name}</p>
                    <p className="text-[10px] text-[#8B7355]">{productTypeLabel(pp.product.type)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    pp.listType === 'fixed' ? 'bg-[#F5EDE6] text-[#C4714A]' : 'bg-[#EDF5ED] text-[#4CAF50] border border-[#4CAF50]/30'
                  }`}>
                    {pp.listType === 'fixed' ? '固定' : '試用'}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C0B0A8" strokeWidth={2} className="w-4 h-4 shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Community teaser ── */}
        {!loading && (
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EDF5ED] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth={1.8} className="w-5 h-5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-[#2C1810]">飼主社群討論板</p>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#FDF3E7] text-[#C4714A] rounded font-medium">即將推出</span>
              </div>
              <p className="text-[10px] text-[#8B7355]">與其他毛孩家長交流分享照護心得</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C0B0A8" strokeWidth={2} className="w-4 h-4 shrink-0">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        )}

      </div>

      {/* ── Edit owner name modal ── */}
      {showEditOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setShowEditOwner(false)}>
          <div className="w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#2C1810] mb-1">編輯飼主名稱</h3>
            <p className="text-xs text-[#8B7355] mb-4">這個名稱會顯示在毛孩檔案頁面上方</p>
            <input value={editNickname} onChange={e => setEditNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveOwnerName()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4714A]/30 mb-4"
              autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setShowEditOwner(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-[#8B7355] text-sm font-medium">取消</button>
              <button onClick={saveOwnerName}
                className="flex-1 py-3 rounded-xl bg-[#C4714A] text-white text-sm font-medium active:opacity-90">儲存</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
