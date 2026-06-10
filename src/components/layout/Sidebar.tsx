'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import FeedbackModal from '@/components/feedback/FeedbackModal'
import ReviewModal from '@/components/feedback/ReviewModal'

interface SidebarPet {
  id: string
  name: string
}

const NAV_ITEMS = [
  {
    href: '/',
    label: '毛孩',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/diet',
    label: '飲食',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </svg>
    ),
  },
  {
    href: '/diary',
    label: '日誌',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  // 注意：營養分析 (/nutrition) 與 AI諮詢 (/nutritionist) 已從 nav 隱藏（保留頁面，日後可加回）
  {
    href: '/news',
    label: '快訊',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7z" />
      </svg>
    ),
  },
] as const

const PurePawLogo = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/app-logo.png" alt="PurePaw Logo" width={40} height={40} className="rounded-xl object-cover" />
)

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [nickname, setNickname] = useState('飼主')
  const [pets, setPets] = useState<SidebarPet[]>([])
  const [currentPetId, setCurrentPetId] = useState<string>('')

  useEffect(() => {
    const stored = localStorage.getItem('drpet_nickname')
    if (stored) setNickname(stored)
    // 初始化目前選中寵物
    const storedPetId = localStorage.getItem('drpet_currentPetId')
    if (storedPetId) setCurrentPetId(storedPetId)
  }, [])

  // 載入寵物清單
  useEffect(() => {
    fetch('/api/pets')
      .then(r => r.json())
      .then((data: SidebarPet[]) => {
        setPets(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
  }, [])

  const displayName = session?.user?.name || nickname
  const avatarUrl = session?.user?.image || null
  const [showMenu, setShowMenu] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function switchPet(petId: string): void {
    localStorage.setItem('drpet_currentPetId', petId)
    window.dispatchEvent(new StorageEvent('storage', { key: 'drpet_currentPetId', newValue: petId }))
    setCurrentPetId(petId)
    setShowMenu(false)
  }

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const itemClass = (href: string): string =>
    `flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer rounded-2xl ${
      isActive(href)
        ? 'bg-[#111111] text-white'
        : 'text-slate-400 hover:bg-slate-50 hover:text-black'
    }`

  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 z-30 shadow-sm flex-col">
      {/* Logo 區 */}
      <div className="flex items-center gap-3 px-6 py-6">
        <PurePawLogo />
        <div>
          <div className="text-lg font-bold text-[#111111] leading-tight">PurePaw</div>
          <div className="text-xs text-slate-400 leading-tight">無敏毛孩</div>
        </div>
      </div>

      {/* 主導覽：毛孩 ｜ 飲食 ｜ 照相 ｜ 日誌 ｜ 快訊 */}
      <nav className="flex-1 px-4 space-y-1">
        {/* 毛孩、飲食 */}
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <Link key={item.href} href={item.href} className={itemClass(item.href)}>
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* 照相 — 特殊按鈕，永不顯示 active 狀態 */}
        <Link
          href="/scan"
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-black"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          照相
        </Link>

        {/* 日誌、快訊 */}
        {NAV_ITEMS.slice(2).map((item) => (
          <Link key={item.href} href={item.href} className={itemClass(item.href)}>
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 底部使用者資訊 */}
      <div className="relative border-t border-slate-100/50" ref={menuRef}>
        {/* ProfileMenu 彈出選單 */}
        {showMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-2" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div className="px-3 py-2 border-b border-slate-50 mb-1">
              <p className="text-xs text-slate-400 font-bold mb-2">切換毛孩</p>
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => switchPet(pet.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg text-left"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${pet.id === currentPetId ? 'bg-[#111111]' : 'bg-[#D98A53]'}`}>
                    {pet.name.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-slate-800 truncate">
                    {pet.name}{pet.id === currentPetId ? ' (目前)' : ''}
                  </span>
                </button>
              ))}
              {pets.length === 0 && (
                <p className="text-xs text-slate-400 px-2 py-1">尚無毛孩資料</p>
              )}
            </div>
            <div className="py-1">
              <button
                onClick={() => { setShowMenu(false); router.push('/settings') }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span className="text-sm font-bold">設定</span>
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowFeedback(true) }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span className="text-sm font-bold">問題回報</span>
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowReview(true) }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span className="text-sm font-bold">評論 / 評分</span>
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-red-500"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span className="text-sm font-bold">登出</span>
              </button>
            </div>
          </div>
        )}

        <div
          onClick={() => setShowMenu(!showMenu)}
          className="px-6 py-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border-2 border-white shadow-sm">
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-[#D98A53] bg-[#FFE8D6]">{displayName.charAt(0)}</span>
            }
          </div>
          <div className="flex flex-col truncate flex-1">
            <span className="text-sm font-bold truncate">{displayName}</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} className="text-slate-400 flex-shrink-0">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showReview && <ReviewModal onClose={() => setShowReview(false)} />}
    </aside>
  )
}
