'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { EMERGENCY_CARE_LIST, type EmergencyCareItem } from '@/data/emergencyCare'

// ─── 型別 ──────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

// ─── inline SVG ────────────────────────────────────────────────────────────────

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SosIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
    <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />
  </svg>
)

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

// ─── 子元件 ────────────────────────────────────────────────────────────────────

function CareCard({ item }: { item: EmergencyCareItem }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-[#2C1810] text-sm leading-snug">{item.name}</h3>
        <span className="shrink-0 bg-[#FEF1E2] text-[#C0392B] px-2.5 py-1 rounded-full text-[11px] font-bold">
          {item.city}
        </span>
      </div>

      <div className="mt-2.5 space-y-1.5 text-xs text-slate-600 font-medium">
        {item.phone && (
          <a
            href={`tel:${item.phone}`}
            className="flex items-center gap-2 text-[#C0392B] hover:underline"
          >
            <PhoneIcon />
            <span>{item.phone}</span>
          </a>
        )}
        {item.address && (
          <p className="flex items-center gap-2">
            <span className="text-slate-400"><PinIcon /></span>
            <span>{item.address}</span>
          </p>
        )}
        {item.hours && (
          <p className="flex items-center gap-2">
            <span className="text-slate-400"><ClockIcon /></span>
            <span>{item.hours}</span>
          </p>
        )}
        {item.note && (
          <p className="text-[11px] text-slate-400 pt-0.5">{item.note}</p>
        )}
      </div>
    </div>
  )
}

// ─── 主元件 ────────────────────────────────────────────────────────────────────

export default function EmergencyCareModal({ onClose }: Props) {
  const [query, setQuery] = useState('')

  // 依縣市 / 名稱搜尋（忽略前後空白）
  const filtered = useMemo<EmergencyCareItem[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return EMERGENCY_CARE_LIST
    return EMERGENCY_CARE_LIST.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.city.toLowerCase().includes(q),
    )
  }, [query])

  const hasData = EMERGENCY_CARE_LIST.length > 0

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#FAF7F2] rounded-t-3xl max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FDEBEA' }}>
              <SosIcon />
            </div>
            <div>
              <span className="font-bold text-lg text-[#2C1810] block leading-tight">緊急協助 SOS</span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">全台各縣市優良緊急照護</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="關閉"
          >
            <XIcon />
          </button>
        </div>

        {/* 搜尋列 */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="relative flex items-center">
            <span className="absolute left-4 text-slate-400"><SearchIcon /></span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋縣市或機構名稱"
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* 列表 */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-px space-y-3"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          {!hasData ? (
            <EmptyState
              title="資料準備中"
              desc="緊急照護機構清單正在整理中，敬請期待。"
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="找不到符合的結果"
              desc={`沒有與「${query.trim()}」相符的縣市或機構，換個關鍵字試試。`}
            />
          ) : (
            filtered.map((item) => <CareCard key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 空狀態 ────────────────────────────────────────────────────────────────────

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6')}>
      <div className="w-14 h-14 rounded-2xl bg-[#FDEBEA] flex items-center justify-center mb-4">
        <SosIcon />
      </div>
      <p className="font-bold text-[#2C1810] text-base mb-1">{title}</p>
      <p className="text-sm text-slate-400 font-medium leading-relaxed">{desc}</p>
    </div>
  )
}
