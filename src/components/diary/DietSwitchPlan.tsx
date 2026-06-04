'use client'

import { useState, useEffect } from 'react'

// 換食計畫元件 — 可獨立使用於日誌頁或飲食頁

// ─── mock 資料（正式環境改接真實 API） ─────────────────────────────────────────
// 換食週期固定 14 天；當前測試商品、排程比例、身體特徵監控皆為展示用 mock。

const SWITCH_PLAN_TOTAL_DAYS = 14

interface TestProduct {
  name: string
  formula: string
  target: string
  tags: string[]
}

interface BodyMetric {
  /** 大便分數 0–7（理想 3–4）；以小數呈現平均 */
  stoolScore: number
  stoolStatus: string
  /** 抓癢頻率（次/日） */
  scratchPerDay: number
  scratchTrend: string
  /** 趨勢是否惡化（決定顯示色） */
  scratchWorsening: boolean
}

const MOCK_TEST_PRODUCT: TestProduct = {
  name: '低敏無穀鮭魚配方 (鮮魚)',
  formula: '低敏無穀鮭魚配方',
  target: '替換 [晚間餐點] 自然本色鮭魚',
  tags: ['高品質蛋白', '腸胃適應期'],
}

const MOCK_BODY_METRIC: BodyMetric = {
  stoolScore: 3.5,
  stoolStatus: '形狀理想',
  scratchPerDay: 2.1,
  scratchTrend: '略微增加',
  scratchWorsening: true,
}

// ─── inline SVG ────────────────────────────────────────────────────────────────

const FlaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <path d="M9 3h6" /><path d="M10 3v6.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-8.5V3" />
  </svg>
)

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
  </svg>
)

const PackageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={30} height={30}>
    <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" />
  </svg>
)

const PromoteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
  </svg>
)

const DiscardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
    <path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
)

function Spinner() {
  return <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
}

// 換食 7 天排程建議：依目標天數推估「今日建議新配方比例」
// 14 天計畫從 0% 線性遞增到 100%，回傳就近的整數比例（新:舊）
function recommendedRatio(dayCount: number): { newPct: number; oldPct: number; label: string } {
  const ratio = Math.min(1, dayCount / SWITCH_PLAN_TOTAL_DAYS)
  // 取就近的四分位呈現，符合設計圖「1:3」這類整齊比例
  const quarters = Math.round(ratio * 4)
  const map: Record<number, { newPct: number; oldPct: number; label: string }> = {
    0: { newPct: 0, oldPct: 100, label: '0:4 (新:舊)' },
    1: { newPct: 25, oldPct: 75, label: '1:3 (新:舊)' },
    2: { newPct: 50, oldPct: 50, label: '1:1 (新:舊)' },
    3: { newPct: 75, oldPct: 25, label: '3:1 (新:舊)' },
    4: { newPct: 100, oldPct: 0, label: '4:0 (新:舊)' },
  }
  return map[quarters]
}

interface DietPlanActiveProps {
  startDate: string
  onPromote: () => void
  onDiscard: () => void
}

function DietPlanActive({ startDate, onPromote, onDiscard }: DietPlanActiveProps) {
  const dayCount = Math.min(
    SWITCH_PLAN_TOTAL_DAYS,
    Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000) + 1),
  )
  const product = MOCK_TEST_PRODUCT
  const metric  = MOCK_BODY_METRIC
  const ratio   = recommendedRatio(dayCount)

  return (
    <div className="space-y-6">
      {/* ── 當前測試商品 ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#8B7355]">
            <FlaskIcon /> 當前測試商品
          </h3>
          <span className="inline-flex items-center gap-1 bg-[#5B7FBB] text-white text-[11px] font-bold rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
            測試中 (第 {dayCount}/{SWITCH_PLAN_TOTAL_DAYS} 天)
          </span>
        </div>
        <div className="bg-white rounded-3xl border border-[#F0E3D6] shadow-sm p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F3F0] flex items-center justify-center shrink-0">
            <PackageIcon />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-[#2C1810] leading-snug">{product.name}</h4>
            <p className="text-xs font-medium text-[#8B7355] mt-1">目標：{product.target}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {product.tags.map((tag) => (
                <span key={tag} className="text-[11px] font-bold text-[#8B7355] bg-[#F5F3F0] rounded-full px-2.5 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7 天換食排程建議 ── */}
      <section>
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#8B7355] mb-3">
          <CalendarIcon /> 7 天換食排程建議
        </h3>
        <div className="bg-white rounded-3xl border border-[#F0E3D6] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-[#2C1810]">今日建議比例</span>
            <span className="font-bold text-[#5B7FBB]">{ratio.label}</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#F0E3D6] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#5B7FBB] transition-all"
              style={{ width: `${ratio.newPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs font-medium text-[#8B7355]">
            <span>新配方 ({ratio.newPct}%)</span>
            <span>舊配方 ({ratio.oldPct}%)</span>
          </div>
        </div>
      </section>

      {/* ── 身體特徵監控 ── */}
      <section>
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#8B7355] mb-3">
          <ChartIcon /> 身體特徵監控 (最近 7 日)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* 大便分數 */}
          <div className="bg-white rounded-3xl border border-[#F0E3D6] shadow-sm p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-[#8B7355]">大便分數</span>
              <span className="text-xl font-bold text-[#2C1810]">{metric.stoolScore.toFixed(1)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#F0E3D6] my-3" />
            <p className="text-[11px] font-medium text-[#8B7355]">目前狀況：{metric.stoolStatus}</p>
          </div>
          {/* 抓癢頻率 */}
          <div className="bg-white rounded-3xl border border-[#F0E3D6] shadow-sm p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-[#8B7355]">抓癢頻率</span>
              <span className={`text-xl font-bold ${metric.scratchWorsening ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                {metric.scratchPerDay.toFixed(1)}<span className="text-sm">次/日</span>
              </span>
            </div>
            <div className={`h-px my-3 ${metric.scratchWorsening ? 'bg-[#FCA5A5]' : 'bg-[#BBF7D0]'}`} />
            <p className={`text-[11px] font-bold ${metric.scratchWorsening ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
              趨勢：{metric.scratchTrend}
            </p>
          </div>
        </div>
      </section>

      {/* ── 底部行動鈕 ── */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={onPromote}
          className="flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-[#7C8471] text-white py-5 font-bold shadow-sm hover:bg-[#6B7361] transition-colors"
        >
          <PromoteIcon />
          晉升日常飲食
        </button>
        <button
          onClick={onDiscard}
          className="flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-white border-2 border-[#F0D6D6] text-[#DC2626] py-5 font-bold shadow-sm hover:bg-[#FEF2F2] transition-colors"
        >
          <DiscardIcon />
          淘汰並更換
        </button>
      </div>
    </div>
  )
}

interface Props {
  petId: string
}

export default function DietSwitchPlan({ petId }: Props) {
  void petId // 正式環境用於拉取真實換食計畫資料；目前為 mock 展示
  const [hasPlan, setHasPlan] = useState(false)
  const [planStart, setPlanStart] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const plan  = localStorage.getItem('drpet_hasPlan')
    const start = localStorage.getItem('drpet_planStart')
    if (plan === 'true' && start) {
      setHasPlan(true)
      setPlanStart(start)
    }
    setHydrated(true)
  }, [])

  function startPlan() {
    const now = new Date().toISOString()
    setHasPlan(true)
    setPlanStart(now)
    localStorage.setItem('drpet_hasPlan', 'true')
    localStorage.setItem('drpet_planStart', now)
  }

  function endPlan() {
    setHasPlan(false)
    setPlanStart('')
    localStorage.removeItem('drpet_hasPlan')
    localStorage.removeItem('drpet_planStart')
  }

  // 尚未 hydrate 前不渲染，避免 localStorage 造成的閃爍
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-8 text-[#C4714A]">
        <Spinner />
      </div>
    )
  }

  if (!hasPlan) {
    return (
      <button
        onClick={startPlan}
        className="w-full text-left bg-[#111111] rounded-2xl p-5 flex items-center justify-between gap-3 group hover:bg-black transition-colors shadow-lg shadow-black/10 relative overflow-hidden"
      >
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none select-none text-8xl">✦</div>
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F391B3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
              <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
            </svg>
            <h3 className="text-white font-bold text-base">AI 換食計劃</h3>
          </div>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">目前的飲食計畫是最佳的嗎？讓 AI 根據毛孩現況為您客製化推薦</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 relative z-10 group-hover:bg-white group-hover:text-black transition-all">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </button>
    )
  }

  return (
    <DietPlanActive
      startDate={planStart}
      onPromote={endPlan}
      onDiscard={endPlan}
    />
  )
}
