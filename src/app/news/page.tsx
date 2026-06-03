'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NewsArticle, NewsCategory } from '@/types'

/* ── 工具函式 ────────────────────────────────────────── */

function formatPublishedDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

/* ── SVG 圖示 ────────────────────────────────────────── */

function IconNewspaper({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7z" />
    </svg>
  )
}

function IconAlertTriangle({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

function IconFork({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      <path d="M12 2v8M8 2v3a4 4 0 0 0 8 0V2M12 10v12" />
    </svg>
  )
}

function IconLeaf({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 8-9 9" />
    </svg>
  )
}

function IconEmpty({ size = 40 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  )
}

/* ── 骨架載入元件 ─────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 animate-pulse">
      <div className="flex gap-3 items-start">
        <div className="w-16 h-4 bg-slate-100 rounded-full" />
        <div className="ml-auto w-20 h-4 bg-slate-100 rounded-full" />
      </div>
      <div className="mt-3 w-full h-4 bg-slate-100 rounded" />
      <div className="mt-2 w-3/4 h-4 bg-slate-100 rounded" />
      <div className="mt-3 w-full h-3 bg-slate-100 rounded" />
      <div className="mt-1.5 w-5/6 h-3 bg-slate-100 rounded" />
    </div>
  )
}

/* ── Tab 1：食安警報卡片 ────────────────────────────── */

function subCategoryStyle(sub: string | null | undefined): { bg: string; text: string } {
  if (sub === '食安通報') return { bg: 'bg-red-50', text: 'text-red-600' }
  if (sub === '廠商警告') return { bg: 'bg-orange-50', text: 'text-orange-600' }
  return { bg: 'bg-slate-50', text: 'text-slate-600' }
}

function FoodSafetyCard({ article }: { article: NewsArticle }) {
  const style = subCategoryStyle(article.subCategory)
  const dateStr = formatPublishedDate(article.publishedAt)

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm p-4 border ${
        article.isUrgent ? 'border-red-100' : 'border-slate-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        {article.subCategory && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${style.bg} ${style.text}`}
          >
            {article.subCategory}
          </span>
        )}
        {dateStr && (
          <span className="text-[11px] text-slate-400 font-medium shrink-0 ml-auto">{dateStr}</span>
        )}
      </div>
      <h4
        className={`font-bold leading-snug text-sm ${
          article.isUrgent ? 'text-red-600' : 'text-slate-900'
        }`}
      >
        {article.title}
      </h4>
      <p className="mt-1.5 text-sm text-slate-600 line-clamp-3">{article.summary}</p>
    </div>
  )
}

/* ── Tab 2：危險禁忌卡片 ────────────────────────────── */

type DangerSubConfig = {
  icon: React.ReactNode
  labelColor: string
  barColor: string
}

function getDangerConfig(sub: string | null | undefined): DangerSubConfig {
  if (sub === '地雷食物') {
    return {
      icon: <IconFork size={16} color="#C4714A" />,
      labelColor: 'text-[#C4714A]',
      barColor: 'bg-[#C4714A]',
    }
  }
  if (sub === '室內植物') {
    return {
      icon: <IconLeaf size={16} color="#16a34a" />,
      labelColor: 'text-green-600',
      barColor: 'bg-green-500',
    }
  }
  return {
    icon: <IconAlertTriangle size={16} color="#64748b" />,
    labelColor: 'text-slate-600',
    barColor: 'bg-slate-400',
  }
}

function DangerCard({ article }: { article: NewsArticle }) {
  const cfg = getDangerConfig(article.subCategory)

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex gap-3 items-stretch overflow-hidden">
      {/* 左側色條 */}
      <div className={`w-[3px] rounded-full shrink-0 ${cfg.barColor}`} />
      <div className="flex-1 min-w-0">
        {article.subCategory && (
          <div className={`flex items-center gap-1.5 mb-1.5 ${cfg.labelColor}`}>
            {cfg.icon}
            <span className="text-[11px] font-bold">{article.subCategory}</span>
          </div>
        )}
        <h4 className="font-bold text-slate-900 leading-snug text-sm">{article.title}</h4>
        <p className="mt-1.5 text-sm text-slate-600 line-clamp-3">{article.summary}</p>
      </div>
    </div>
  )
}

/* ── Tab 3：健康知識卡片 ─────────────────────────────── */

function HealthCard({ article }: { article: NewsArticle }) {
  const handleOpenSource = () => {
    if (article.sourceUrl) {
      window.open(article.sourceUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
      <h4 className="font-bold text-slate-900 leading-snug text-sm">{article.title}</h4>
      <p className="mt-1.5 text-sm text-slate-600 line-clamp-3">{article.summary}</p>
      <div className="flex items-center justify-between mt-3">
        {article.sourceName ? (
          <span className="text-blue-500 text-sm font-medium">{article.sourceName}</span>
        ) : (
          <span />
        )}
        {article.sourceUrl && (
          <button
            onClick={handleOpenSource}
            className="text-sm text-blue-500 font-medium hover:text-blue-600 transition-colors"
          >
            查看原文 ↗
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Tab 設定 ────────────────────────────────────────── */

type TabConfig = {
  key: NewsCategory
  label: string
}

const TABS: TabConfig[] = [
  { key: 'food_safety', label: '食安警報' },
  { key: 'danger', label: '危險禁忌' },
  { key: 'health', label: '健康知識' },
]

/* ── 主元件 ──────────────────────────────────────────── */

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<NewsCategory>('food_safety')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchArticles = useCallback(async (category: NewsCategory) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/news?category=${category}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data: NewsArticle[] = await res.json()
      setArticles(data)
    } catch {
      setError('無法載入資料，請稍後再試。')
      setArticles([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始載入食安警報
  useEffect(() => {
    fetchArticles('food_safety')
  }, [fetchArticles])

  const handleTabChange = (tab: NewsCategory) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    fetchArticles(tab)
  }

  const renderCard = (article: NewsArticle) => {
    if (activeTab === 'food_safety') return <FoodSafetyCard key={article.id} article={article} />
    if (activeTab === 'danger') return <DangerCard key={article.id} article={article} />
    return <HealthCard key={article.id} article={article} />
  }

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF1E2] flex items-center justify-center text-[#C4714A] shrink-0">
          <IconNewspaper size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">快訊通知</h1>
          <p className="text-sm text-slate-500 font-medium">毛孩相關消息主動推播給你</p>
        </div>
        {/* 最新動態 badge，目前為 UI 裝飾，後續可接通知數量 */}
        <span className="shrink-0 text-[11px] font-bold text-white bg-[#C4714A] rounded-full px-3 py-1">
          最新動態
        </span>
      </div>

      {/* Tab 切換器 */}
      <div className="flex gap-2 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 text-sm font-bold px-3 py-2 rounded-full transition-colors ${
              activeTab === tab.key
                ? 'bg-[#111111] text-white'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 內容區 */}
      <div className="flex-1 space-y-3">
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <IconEmpty size={40} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!isLoading && !error && articles.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <IconEmpty size={40} />
            <p className="text-sm font-medium">暫無相關資訊，AI 定期更新中...</p>
          </div>
        )}

        {!isLoading && !error && articles.map(renderCard)}
      </div>
    </div>
  )
}
