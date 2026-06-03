'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function BottomNav() {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => { setPendingHref(null) }, [pathname])

  const isActive = (href: string) => {
    const p = pendingHref ?? pathname
    if (href === '/') return p === '/'
    return p.startsWith(href)
  }

  const activeColor = 'text-[#C4714A]'
  const inactiveColor = 'text-[#8B7355]/60'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E8DDD5]">
      <div className="max-w-[480px] mx-auto flex items-end h-[60px]">

        {/* 基本資料 */}
        <Link href="/" onClick={() => setPendingHref('/')}
          className={`flex-1 flex flex-col items-center justify-center pb-2 gap-0.5 text-[10px] font-medium transition-colors ${isActive('/') ? activeColor : inactiveColor}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M10.5 2.5C10.5 2.5 9 4 6.5 4S3 2.5 3 2.5A9.5 9.5 0 0 0 3 9c0 5.25 9 11 9 11s9-5.75 9-11a9.5 9.5 0 0 0 0-6.5S19 4 16.5 4 13.5 2.5 13.5 2.5" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          基本資料
        </Link>

        {/* 日誌 */}
        <Link href="/log" onClick={() => setPendingHref('/log')}
          className={`flex-1 flex flex-col items-center justify-center pb-2 gap-0.5 text-[10px] font-medium transition-colors ${isActive('/log') ? activeColor : inactiveColor}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          日誌
        </Link>

        {/* 即時分析 — center raised */}
        <Link href="/scan" onClick={() => setPendingHref('/scan')}
          className="flex-1 flex flex-col items-center justify-end pb-2 gap-0.5">
          <div className={`w-14 h-14 -mt-5 rounded-full flex items-center justify-center shadow-lg transition-colors ${isActive('/scan') ? 'bg-[#B06040]' : 'bg-[#C4714A]'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <span className={`text-[10px] font-medium ${isActive('/scan') ? activeColor : inactiveColor}`}>即時分析</span>
        </Link>

        {/* 產品管理 */}
        <Link href="/products" onClick={() => setPendingHref('/products')}
          className={`flex-1 flex flex-col items-center justify-center pb-2 gap-0.5 text-[10px] font-medium transition-colors ${isActive('/products') ? activeColor : inactiveColor}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          產品管理
        </Link>

        {/* AI營養師 */}
        <Link href="/chat" onClick={() => setPendingHref('/chat')}
          className={`flex-1 flex flex-col items-center justify-center pb-2 gap-0.5 text-[10px] font-medium transition-colors ${isActive('/chat') ? activeColor : inactiveColor}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          AI營養師
        </Link>

      </div>
    </nav>
  )
}
