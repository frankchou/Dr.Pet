'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

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

const NO_SHELL_PATHS = ['/landing']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [nickname, setNickname] = useState('飼主')
  const scrollRef = useRef<HTMLElement>(null)
  const { data: session } = useSession()
  const avatarUrl = session?.user?.image || null
  const displayName = session?.user?.name || nickname

  // All hooks must be before any conditional return
  useEffect(() => {
    const stored = localStorage.getItem('drpet_nickname')
    if (stored) setNickname(stored)
  }, [])

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
  const hideChrome = pathname === '/nutritionist'

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
          className="flex-1 overflow-y-auto pb-28 md:pb-10 hide-scrollbar relative"
        >
          {/* Sticky transparent header */}
          <header className="px-6 md:px-10 pt-12 md:pt-10 pb-4 flex items-center justify-between z-30 sticky top-0 bg-transparent pointer-events-none">

            {/* Mobile: user avatar */}
            <div className={`relative flex items-center gap-3 md:hidden transition-all duration-300 ${fade} ${hideChrome ? 'invisible' : ''}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FFE8D6] flex items-center justify-center shadow-sm border border-white/50 pointer-events-auto cursor-pointer">
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <span className="text-sm font-bold text-[#D98A53]">{displayName.charAt(0)}</span>
                }
              </div>
            </div>

            {/* Desktop: page title + subtitle */}
            <div className={`hidden md:block transition-all duration-300 ${fade}`}>
              {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
              {subtitle && <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>}
            </div>

            {/* Bell icon */}
            {!hideChrome && (
              <button
                className={`w-10 h-10 rounded-full border border-white/40 bg-white/30 backdrop-blur-md flex items-center justify-center hover:bg-white/60 transition-all duration-300 shadow-sm ml-auto pointer-events-auto ${fade}`}
              >
                <BellIcon />
              </button>
            )}
          </header>

          {/* Desktop: white rounded card wrapper */}
          <div className="max-w-6xl mx-auto w-full min-h-full flex flex-col md:bg-white md:rounded-[40px] md:shadow-sm md:border md:border-slate-100 md:mt-2 md:mb-6 md:p-6">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </div>
  )
}
