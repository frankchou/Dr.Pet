'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  EMERGENCY_CARE_LIST,
  type EmergencyCareItem,
  type PetKind,
  type Region,
  type Specialty,
  type CareResource,
} from '@/data/emergencyCare'

// ─── 型別 ──────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

/** 四組篩選的當前選取狀態（每組可多選） */
interface FilterState {
  petKinds: PetKind[]
  regions: Region[]
  specialties: Specialty[]
  resources: CareResource[]
}

const EMPTY_FILTER: FilterState = { petKinds: [], regions: [], specialties: [], resources: [] }

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

// 地址旁的小箭頭，暗示「點擊會跳轉至外部地圖」
const ExternalArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" width={11} height={11}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
)

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

// ─── 工具 ──────────────────────────────────────────────────────────────────────

/** 顯示用完整地址：region + district + 街道 */
function fullAddress(item: EmergencyCareItem): string | null {
  const parts = [item.region, item.district, item.address].filter(Boolean)
  return parts.length > 0 ? parts.join('') : null
}

/**
 * 用 Google Maps 的 search 模式開地圖（顯示在地圖上，不直接給導航路線）。
 * 讓使用者抵達地圖 App 後自行決定是否導航。
 */
function openMap(address: string): void {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  window.open(url, '_blank', 'noopener')
}

/** 該卡片是否需要「資料未完全核實」提示 */
function needsVerifyHint(item: EmergencyCareItem): boolean {
  return item.verified === 'medium' || (item.hours?.includes('待確認') ?? false)
}

/** 收集資料中「實際存在」的篩選選項，避免列出空選項 */
function collectOptions<T>(getter: (item: EmergencyCareItem) => T[]): T[] {
  const seen = new Set<T>()
  for (const item of EMERGENCY_CARE_LIST) {
    for (const v of getter(item)) seen.add(v)
  }
  return [...seen]
}

// 依資料動態產生各組選項；保留固定的合理排序，僅列出真正存在的值
const PET_KIND_ORDER: PetKind[] = ['狗', '貓', '特寵']
const REGION_ORDER: Region[] = ['台北市', '新北市', '台中市', '宜蘭縣']
const SPECIALTY_ORDER: Specialty[] = [
  '齒科', '神經科', '腫瘤科', '內科', '心臟科', '皮膚科', '針灸', '復健科',
  '貓專科', '行為學', 'FIP', '外傷', '血檢', '結紮',
]
const RESOURCE_ORDER: CareResource[] = ['血庫', 'CT/MRI', '影像', '24小時急診']

function orderedOptions<T>(order: T[], available: Set<T>): T[] {
  return order.filter((v) => available.has(v))
}

// ─── 子元件 ────────────────────────────────────────────────────────────────────

/** 單一可多選的篩選 chip；緊湊但保留足夠觸控區（py-1.5 → 約 30px 高） */
function FilterChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
        active
          ? 'bg-[#C4714A] border-[#C4714A] text-white'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
      )}
    >
      {label}
    </button>
  )
}

/**
 * 一組篩選 = 一條固定高度的橫向可滑動 chip 列。
 * 左側常駐小組名標籤，右側 chips 一排不換行、可左右滑。
 * 急救情境刻意不收合，四組只佔四條細列、垂直高度可預期，不擠掉清單。
 */
function FilterGroup<T extends string>({
  shortTitle,
  options,
  selected,
  onToggle,
}: {
  shortTitle: string
  options: T[]
  selected: T[]
  onToggle: (value: T) => void
}) {
  if (options.length === 0) return null
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 w-9 text-[11px] font-bold text-slate-400 tracking-wide text-right">
        {shortTitle}
      </span>
      <div className="flex-1 min-w-0 flex flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap hide-scrollbar -my-1 py-1">
        {options.map((opt) => (
          <FilterChip key={opt} label={opt} active={selected.includes(opt)} onToggle={() => onToggle(opt)} />
        ))}
      </div>
    </div>
  )
}

function CareCard({ item, onCall }: { item: EmergencyCareItem; onCall: (item: EmergencyCareItem) => void }) {
  const address = fullAddress(item)
  const tags = [...item.specialties, ...item.resources]

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-[#2C1810] text-sm leading-snug">{item.name}</h3>
        <span className="shrink-0 bg-[#FEF1E2] text-[#C0392B] px-2.5 py-1 rounded-full text-[11px] font-bold">
          {item.region}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5 space-y-1.5 text-xs text-slate-600 font-medium">
        {item.phone && (
          <button
            type="button"
            onClick={() => onCall(item)}
            className="flex items-center gap-2 text-[#C0392B] hover:underline"
          >
            <PhoneIcon />
            <span>{item.phone}</span>
          </button>
        )}
        {address && (
          // 開地圖屬低風險動作，直接開啟、不做二次確認；用品牌色與電話的急救紅區隔
          <button
            type="button"
            onClick={() => openMap(address)}
            className="flex items-center gap-2 text-[#C4714A] hover:underline text-left"
          >
            <PinIcon />
            <span className="underline underline-offset-2 decoration-[#C4714A]/40">{address}</span>
            <span className="shrink-0 text-[#C4714A]/70"><ExternalArrowIcon /></span>
          </button>
        )}
        {item.hours && (
          <p className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0"><ClockIcon /></span>
            <span>{item.hours}</span>
          </p>
        )}
        {item.note && (
          <p className="text-[11px] text-slate-400 pt-0.5">{item.note}</p>
        )}
        {needsVerifyHint(item) && (
          <p className="flex items-center gap-1.5 text-[11px] text-[#B8742C] bg-[#FBF3E7] rounded-lg px-2 py-1.5 mt-1.5">
            <span className="shrink-0"><AlertIcon /></span>
            <span>資料未完全核實，建議致電前再確認</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ─── 主元件 ────────────────────────────────────────────────────────────────────

export default function EmergencyCareModal({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER)
  // 撥號確認對話框：null 表示未開啟
  const [callTarget, setCallTarget] = useState<EmergencyCareItem | null>(null)

  // 各組篩選只列出資料中實際存在的值
  const petKindOptions = useMemo(() => orderedOptions(PET_KIND_ORDER, new Set(collectOptions((i) => i.petKinds))), [])
  const regionOptions = useMemo(() => orderedOptions(REGION_ORDER, new Set(collectOptions((i) => [i.region]))), [])
  const specialtyOptions = useMemo(() => orderedOptions(SPECIALTY_ORDER, new Set(collectOptions((i) => i.specialties))), [])
  const resourceOptions = useMemo(() => orderedOptions(RESOURCE_ORDER, new Set(collectOptions((i) => i.resources))), [])

  // 切換某組內的單一選項
  const toggle = <K extends keyof FilterState>(group: K, value: FilterState[K][number]) => {
    setFilters((prev) => {
      const cur = prev[group] as FilterState[K][number][]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...prev, [group]: next }
    })
  }

  const activeFilterCount =
    filters.petKinds.length + filters.regions.length + filters.specialties.length + filters.resources.length

  // 篩選 + 文字同時生效：組內 OR、組間 AND，再疊上文字模糊搜尋
  const filtered = useMemo<EmergencyCareItem[]>(() => {
    const q = query.trim().toLowerCase()
    return EMERGENCY_CARE_LIST.filter((item) => {
      if (filters.petKinds.length && !filters.petKinds.some((p) => item.petKinds.includes(p))) return false
      if (filters.regions.length && !filters.regions.includes(item.region)) return false
      if (filters.specialties.length && !filters.specialties.some((s) => item.specialties.includes(s))) return false
      if (filters.resources.length && !filters.resources.some((r) => item.resources.includes(r))) return false
      if (q) {
        const haystack = `${item.name} ${item.region} ${item.district ?? ''} ${item.address ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [query, filters])

  const hasData = EMERGENCY_CARE_LIST.length > 0

  // 撥號確認：確認後才導向 tel:（行動裝置撥號；桌機通常無動作但不報錯）
  const confirmCall = () => {
    if (callTarget?.phone) {
      window.location.href = `tel:${callTarget.phone.replace(/[^0-9+]/g, '')}`
    }
    setCallTarget(null)
  }

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
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">急救醫院清單（大台北・宜蘭）</span>
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

        {/* 篩選 + 搜尋列：整塊置頂 shrink-0，四條橫向滑動 chip 列高度固定可預期 */}
        <div className="px-5 pt-3 pb-3 shrink-0 space-y-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 tracking-wide">快速篩選</span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTER)}
                className="shrink-0 text-[11px] font-bold text-[#C4714A] underline underline-offset-2"
              >
                清除全部（{activeFilterCount}）
              </button>
            )}
          </div>

          <FilterGroup shortTitle="種類" options={petKindOptions} selected={filters.petKinds} onToggle={(v) => toggle('petKinds', v)} />
          <FilterGroup shortTitle="地區" options={regionOptions} selected={filters.regions} onToggle={(v) => toggle('regions', v)} />
          <FilterGroup shortTitle="科別" options={specialtyOptions} selected={filters.specialties} onToggle={(v) => toggle('specialties', v)} />
          <FilterGroup shortTitle="設備" options={resourceOptions} selected={filters.resources} onToggle={(v) => toggle('resources', v)} />

          <div className="relative flex items-center pt-0.5">
            <span className="absolute left-4 text-slate-400"><SearchIcon /></span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋名稱 / 地區 / 地址"
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* 列表 */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-3 space-y-3"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          {!hasData ? (
            <EmptyState title="資料準備中" desc="緊急照護機構清單正在整理中，敬請期待。" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="找不到符合的結果"
              desc="沒有符合目前篩選與關鍵字的機構，調整條件再試試。"
            />
          ) : (
            filtered.map((item) => <CareCard key={item.id} item={item} onCall={setCallTarget} />)
          )}
        </div>
      </div>

      {/* 撥號確認對話框 */}
      {callTarget && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-8"
          onClick={(e) => { if (e.target === e.currentTarget) setCallTarget(null) }}
        >
          <div className="bg-white rounded-2xl w-full max-w-[320px] p-5 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-[#FDEBEA] flex items-center justify-center mx-auto mb-3">
              <SosIcon />
            </div>
            <p className="text-center font-bold text-[#2C1810] text-base mb-1">撥打電話</p>
            <p className="text-center text-sm text-slate-500 font-medium leading-relaxed mb-5">
              撥打 <span className="font-bold text-[#C0392B]">{callTarget.phone}</span>
              <br />給「{callTarget.name}」？
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCallTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmCall}
                className="flex-1 py-2.5 rounded-xl bg-[#C0392B] text-white text-sm font-bold hover:bg-[#a93226] transition-colors"
              >
                撥打
              </button>
            </div>
          </div>
        </div>
      )}
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
