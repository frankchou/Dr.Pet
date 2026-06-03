'use client'

/* ── 型別 ─────────────────────────────────────────── */

type NewsType = 'danger' | 'award' | 'recall' | 'knowledge' | 'promo' | 'system'

interface NewsItem {
  type: NewsType
  used: boolean
  title: string
  source: string
  time: string
  unread: boolean
}

/* ── 類型配置 ─────────────────────────────────────── */

const NEWS_TYPES: Record<NewsType, { label: string; bg: string; color: string; iconPath: string }> = {
  danger: {
    label: '食安警示', bg: '#FEF2F2', color: '#DC2626',
    iconPath: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01',
  },
  award: {
    label: '得獎好消息', bg: '#E2F3E4', color: '#2D6A4F',
    iconPath: 'circle:12,8,6|M15.477 12.89L17 22l-5-3-5 3 1.523-9.11',
  },
  recall: {
    label: '食安公告', bg: '#FEF1E2', color: '#CA8A04',
    iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M12 8v4|M12 16h.01',
  },
  knowledge: {
    label: '營養知識', bg: '#EDF3FB', color: '#475569',
    iconPath: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z|M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
  },
  promo: {
    label: '優惠活動', bg: '#FDE2EC', color: '#BE3D73',
    iconPath: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z|M7 7h.01',
  },
  system: {
    label: '系統通知', bg: '#F1F5F9', color: '#64748B',
    iconPath: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 0 1-3.46 0',
  },
}

/* ── 靜態示範資料 ───────────────────────────────────── */

const NEWS_BRAND: NewsItem[] = [
  {
    type: 'danger', used: true, unread: true,
    title: '「自然本色」部分批次鮭魚配方啟動自主回收',
    source: '食品藥物管理署', time: '2 小時前',
  },
  {
    type: 'award', used: true, unread: true,
    title: '「毛孩關鍵 益生菌」榮獲 2026 台灣寵物保健金獎',
    source: '品牌新聞', time: '1 天前',
  },
  {
    type: 'recall', used: true, unread: false,
    title: '你常用的「純啖」雞胸肉塊通過 SGS 重金屬檢驗合格',
    source: '品牌公告', time: '3 天前',
  },
]

const NEWS_GENERAL: NewsItem[] = [
  {
    type: 'recall', used: false, unread: false,
    title: '農業部公告：市售進口飼料黴菌毒素抽驗結果出爐',
    source: '農業部', time: '3 天前',
  },
  {
    type: 'knowledge', used: false, unread: false,
    title: '老年犬腎臟保健：磷與鈣的攝取要點懶人包',
    source: '營養知識', time: '4 天前',
  },
  {
    type: 'promo', used: false, unread: false,
    title: '換食季限定：精選低敏無穀飼料 9 折優惠',
    source: '優惠活動', time: '5 天前',
  },
  {
    type: 'system', used: false, unread: false,
    title: '「布丁」的年度疫苗接種剩 15 天，記得預約',
    source: '系統通知', time: '1 週前',
  },
]

/* ── 類型圖示（依 iconPath 規格渲染）───────────────── */

function NewsTypeIcon({ type, size = 22 }: { type: NewsType; size?: number }) {
  const cfg = NEWS_TYPES[type]
  const parts = cfg.iconPath.split('|')

  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke={cfg.color}
      strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
      width={size} height={size}
    >
      {parts.map((part, i) => {
        if (part.startsWith('circle:')) {
          const [, cx, cy, r] = part.split(':')[1].split(',')
          return <circle key={i} cx={cx} cy={cy} r={r} />
        }
        return <path key={i} d={part} />
      })}
    </svg>
  )
}

/* ── 新聞卡片 ─────────────────────────────────────── */

function NewsCard({ n }: { n: NewsItem }) {
  const t = NEWS_TYPES[n.type]
  return (
    <button className="w-full text-left bg-white border-2 border-slate-900/5 rounded-[24px] p-4 flex gap-3.5 items-start shadow-sm hover:shadow-md transition-shadow relative">
      {n.unread && (
        <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#DC2626]" aria-label="未讀" />
      )}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: t.bg }}
      >
        <NewsTypeIcon type={n.type} size={22} />
      </div>
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: t.bg, color: t.color }}
          >
            {t.label}
          </span>
          {n.used && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#111111] text-white">
              您的毛孩正在食用
            </span>
          )}
        </div>
        <h4 className="font-bold text-slate-900 leading-snug text-sm">{n.title}</h4>
        <p className="text-[11px] font-bold text-slate-400 mt-1.5">{n.source} · {n.time}</p>
      </div>
    </button>
  )
}

/* ── 頁面圖示 ──────────────────────────────────────── */

function IconNewspaper({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7z" />
    </svg>
  )
}

/* ── 主元件 ──────────────────────────────────────── */

export default function NewsPage() {
  const unreadCount = NEWS_BRAND.filter(n => n.unread).length

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF1E2] flex items-center justify-center text-[#D98A53] shrink-0">
          <IconNewspaper size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">快訊與通知</h1>
          <p className="text-sm text-slate-500 font-medium">毛孩相關消息主動推播給你</p>
        </div>
      </div>

      {/* 與毛孩相關區塊 */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-bold text-slate-900">與你的毛孩相關</h2>
        {unreadCount > 0 && (
          <span className="text-[11px] font-bold text-white bg-[#DC2626] rounded-full px-2 py-0.5">
            {unreadCount} 則新訊息
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-slate-400 mb-3">
        你正在使用的食品廠商，有得獎、食安等好壞消息時會主動通知。
      </p>
      <div className="space-y-3 mb-8">
        {NEWS_BRAND.map((n, i) => (
          <NewsCard key={i} n={n} />
        ))}
      </div>

      {/* 其他通知區塊 */}
      <h2 className="text-base font-bold text-slate-900 mb-3">其他通知</h2>
      <div className="space-y-3">
        {NEWS_GENERAL.map((n, i) => (
          <NewsCard key={i} n={n} />
        ))}
      </div>
    </div>
  )
}
