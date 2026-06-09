'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/',
    label: '毛孩',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/diet',
    label: '飲食',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </svg>
    ),
  },
] as const

// 注意：營養 (/nutrition) 與 AI諮詢 (/nutritionist) 已從 nav 隱藏（保留頁面，日後可加回）
const RIGHT_NAV_ITEMS = [
  {
    href: '/diary',
    label: '日誌',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    href: '/news',
    label: '快訊',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7z" />
      </svg>
    ),
  },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => { setPendingHref(null) }, [pathname])

  const isActive = (href: string): boolean => {
    const p = pendingHref ?? pathname
    if (href === '/') return p === '/'
    return p === href || p.startsWith(href + '/')
  }

  const NavItem = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    const active = isActive(href)
    return (
      <Link
        href={href}
        onClick={() => setPendingHref(href)}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1"
      >
        <div className={`p-1.5 rounded-2xl transition-all ${active ? 'bg-[#111111] text-white' : 'text-slate-400'}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-[#111111]' : 'text-slate-400'}`}>
          {label}
        </span>
      </Link>
    )
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100"
      style={{ boxShadow: 'var(--pp-shadow-nav)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-end h-[60px]">
        {/* 左側 tab：毛孩、飲食 */}
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}

        {/* 中央凸起相機 FAB */}
        <div className="flex-1 flex flex-col items-center justify-end pb-2">
          <Link
            href="/scan"
            onClick={() => setPendingHref('/scan')}
            className="w-14 h-14 -top-6 relative rounded-full bg-[#111111] flex items-center justify-center shadow-lg transition-opacity active:opacity-80"
            aria-label="即時分析"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </Link>
        </div>

        {/* 右側 tab：日誌、快訊 */}
        {RIGHT_NAV_ITEMS.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </div>
    </nav>
  )
}
