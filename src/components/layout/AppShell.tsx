'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import FeedbackModal from '@/components/feedback/FeedbackModal'
import ReviewModal from '@/components/feedback/ReviewModal'

const HEADER_META: Record<string, [string, string]> = {
  '/':             ['總覽',      '讓我們來看看今天的營養狀況吧'],
  '/diary':        ['日誌',      '記錄毛孩的每一天'],
  '/diet':         ['飲食計畫',  '管理毛孩的每日配餐'],
  '/settings':     ['設定與檔案', '管理毛孩資料與紀錄參數'],
  '/nutritionist': ['AI 諮詢',  '與 AI 討論毛孩的健康問題'],
  '/nutrition':    ['營養分析', '毛孩成分風險與營養報告'],
  '/news':         ['快訊',      '最新營養知識與通知'],
  '/scan':         ['即時分析',  '拍照分析食品成分'],
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// 不套用 App 外框（Sidebar / BottomNav / header）的路徑。
// /privacy、/terms 為對外法遵頁，需自帶版面且不依賴登入狀態。
const NO_SHELL_PATHS = ['/landing', '/privacy', '/terms']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [nickname, setNickname] = useState('飼主')
  const scrollRef = useRef<HTMLElement>(null)
  const { data: session } = useSession()
  const router = useRouter()
  const avatarUrl = session?.user?.image || null
  const displayName = session?.user?.name || nickname

  // 手機版頭像選單（對齊桌面 Sidebar 的 ProfileMenu：切換毛孩 / 設定 / 登出）
  const [pets, setPets] = useState<{ id: string; name: string }[]>([])
  const [currentPetId, setCurrentPetId] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // All hooks must be before any conditional return
  useEffect(() => {
    // localStorage 僅存在於 client，惰性初始化會造成 SSR/hydration 不一致，故於 effect 水合
    const stored = localStorage.getItem('drpet_nickname')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setNickname(stored)
    const storedPetId = localStorage.getItem('drpet_currentPetId')
    if (storedPetId) setCurrentPetId(storedPetId)
  }, [])

  // 載入毛孩清單（供切換）
  useEffect(() => {
    fetch('/api/pets')
      .then(r => r.json())
      .then((data: { id: string; name: string }[]) => setPets(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // 點選單外關閉；同步其他來源（桌面切換）的 currentPetId
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'drpet_currentPetId' && e.newValue) setCurrentPetId(e.newValue)
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('storage', handleStorage)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  function switchPet(petId: string): void {
    localStorage.setItem('drpet_currentPetId', petId)
    window.dispatchEvent(new StorageEvent('storage', { key: 'drpet_currentPetId', newValue: petId }))
    setCurrentPetId(petId)
    setShowMenu(false)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 10)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Landing / no-shell paths: render children without app chrome
  if (NO_SHELL_PATHS.some(p => pathname.startsWith(p))) {
    return <>{children}</>
  }

  const [title, subtitle] = HEADER_META[pathname] ?? ['', '']
  const fade = scrolled
    ? 'opacity-0 -translate-y-3 pointer-events-none'
    : 'opacity-100 translate-y-0 pointer-events-auto'
  const isChat = pathname === '/nutritionist'

  return (
    <div
      className="min-h-screen bg-[#F4F7FB] flex justify-center md:justify-start text-slate-900"
      style={{ fontFamily: 'var(--pp-font)' }}
    >
      {/* Desktop sidebar (fixed, w-64) */}
      <Sidebar />

      {/* Content column */}
      <div className="w-full md:flex-1 md:ml-64 bg-white md:bg-transparent shadow-2xl md:shadow-none flex flex-col relative h-[100dvh] overflow-hidden">

        {/* Scrollable main — this is the scroll container */}
        <main
          ref={scrollRef}
          id="main-scroll-container"
          className={isChat
            ? 'flex-1 overflow-hidden relative'
            : 'flex-1 overflow-y-auto pb-28 md:pb-10 hide-scrollbar relative'}
        >
          {/* Sticky transparent header — hidden on chat page */}
          {!isChat && (
            <header className="px-6 md:px-10 pt-12 md:pt-10 pb-4 flex items-center justify-between z-30 sticky top-0 bg-transparent pointer-events-none">

              {/* Mobile: user avatar — 點擊開啟選單（切換毛孩 / 設定 / 登出），對齊桌面 */}
              <div ref={menuRef} className={`relative md:hidden transition-all duration-300 ${fade}`}>
                <button
                  onClick={() => setShowMenu(v => !v)}
                  aria-label="開啟選單"
                  className="w-10 h-10 rounded-full overflow-hidden bg-[#FFE8D6] flex items-center justify-center shadow-sm border border-white/50 pointer-events-auto cursor-pointer"
                >
                  {avatarUrl
                    // 使用者頭像為 Google 遠端圖（需 referrerPolicy=no-referrer，next/image 不支援該屬性），維持 <img>
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <span className="text-sm font-bold text-[#D98A53]">{displayName.charAt(0)}</span>
                  }
                </button>

                {showMenu && (
                  <div className="absolute top-full left-0 mt-2 w-60 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 pointer-events-auto" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
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
              </div>

              {/* Desktop: page title + subtitle */}
              <div className={`hidden md:block transition-all duration-300 ${fade}`}>
                {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
                {subtitle && <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>}
              </div>

              {/* Bell icon — 通知/快訊，導向 /news */}
              <button
                onClick={() => router.push('/news')}
                aria-label="通知與快訊"
                className={`w-10 h-10 rounded-full border border-white/40 bg-white/30 backdrop-blur-md flex items-center justify-center hover:bg-white/60 transition-all duration-300 shadow-sm ml-auto pointer-events-auto ${fade}`}
              >
                <BellIcon />
              </button>
            </header>
          )}

          {/* Content wrapper — h-full with card for chat, min-h-full with margins for others */}
          <div className={isChat
            ? 'h-full flex flex-col md:bg-white md:rounded-[40px] md:shadow-sm md:border md:border-slate-100 md:p-6'
            : 'max-w-6xl mx-auto w-full min-h-full flex flex-col md:bg-white md:rounded-[40px] md:shadow-sm md:border md:border-slate-100 md:mt-2 md:mb-6 md:p-6'}>
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showReview && <ReviewModal onClose={() => setShowReview(false)} />}
    </div>
  )
}
