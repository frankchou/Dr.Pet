'use client'

import { useState, useEffect } from 'react'

// 換食計畫元件 — 可獨立使用於日誌頁或飲食頁

interface RecommendedProduct {
  name: string
  description: string
  pros: string[]
  avoid: string[]
  tip?: string
}

function RecCard({ name, description, pros, avoid, tip }: RecommendedProduct) {
  return (
    <div className="bg-[#FFFBF7] border border-[#F0E3D6] rounded-2xl p-4">
      <h4 className="font-bold text-[#D98A53] leading-snug mb-2">{name}</h4>
      <p className="text-xs font-medium text-slate-600 leading-relaxed mb-3">{description}</p>
      <div className="space-y-1.5">
        {pros.map((p, i) => (
          <p key={`pro-${i}`} className="text-xs font-medium text-[#16A34A] leading-relaxed flex gap-1.5">
            <span className="shrink-0">✓</span>{p}
          </p>
        ))}
        {(avoid ?? []).map((a, i) => (
          <p key={`avoid-${i}`} className="text-xs font-medium text-[#DC2626] leading-relaxed flex gap-1.5 bg-[#FEF2F2] rounded-lg px-2 py-1.5">
            <span className="shrink-0">✕ 避開</span>{a}
          </p>
        ))}
      </div>
      {tip && <p className="text-[11px] font-medium text-slate-400 leading-relaxed mt-2.5">💡 {tip}</p>}
    </div>
  )
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
}

interface DietPlanActiveProps {
  petId: string
  startDate: string
  onEnd: () => void
}

function DietPlanActive({ petId, startDate, onEnd }: DietPlanActiveProps) {
  const [recs, setRecs]       = useState<RecommendedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [timestamp, setTimestamp] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)

  const dayCount = Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000) + 1)

  useEffect(() => {
    if (!petId) return
    setLoading(true)
    fetch(`/api/recommend?petId=${petId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'recommendations' in data) {
          type ApiRec = { forProduct: string; alternatives: { productName: string; reason: string; keyFeatures: string[]; avoid: string[]; searchTip?: string }[] }
          const raw = (data as { recommendations: ApiRec[] }).recommendations
          const flat: RecommendedProduct[] = raw.flatMap(r =>
            (r.alternatives ?? []).map(a => ({
              name: a.productName,
              description: `取代「${r.forProduct}」— ${a.reason}`,
              pros: a.keyFeatures ?? [],
              avoid: a.avoid ?? [],
              tip: a.searchTip,
            }))
          )
          setRecs(flat)
        }
        setTimestamp(new Date().toLocaleString('zh-TW'))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [petId, refreshCount])

  return (
    <div className="space-y-4">
      <div className="bg-[#E2F3E4] rounded-2xl p-4 border border-[#B7E4C7] shadow-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-[#2D6A4F] font-bold text-sm">換食計畫進行中</h3>
          <p className="text-[#1B4332] font-bold">換食進度：第 {dayCount} 天</p>
        </div>
        <button
          onClick={onEnd}
          className="text-xs font-bold text-[#2D6A4F] border border-[#2D6A4F]/30 rounded-full px-3 py-1.5 hover:bg-[#2D6A4F]/10 transition-colors shrink-0"
        >
          結束計劃
        </button>
      </div>

      <div className="bg-white rounded-[24px] border-2 border-slate-900/5 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="#D98A53" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <h3 className="font-bold text-lg">AI 產品替代推薦</h3>
        </div>
        <p className="text-sm font-medium text-slate-400 mb-4">根據風險成分與寵物健康狀況，推薦具體的替代產品</p>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-[#D98A53]">
            <Spinner />
          </div>
        ) : recs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">暫無推薦資料</p>
        ) : (
          <div className="space-y-3">
            {recs.map((rec, i) => <RecCard key={i} {...rec} />)}
          </div>
        )}
        {!loading && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
            <span className="text-[11px] font-bold text-slate-400">{timestamp}</span>
            <button
              onClick={() => setRefreshCount(c => c + 1)}
              className="text-sm font-bold text-[#D98A53] hover:underline"
            >
              重新取得建議
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  petId: string
}

export default function DietSwitchPlan({ petId }: Props) {
  const [hasPlan, setHasPlan] = useState(false)
  const [planStart, setPlanStart] = useState('')

  useEffect(() => {
    const plan  = localStorage.getItem('drpet_hasPlan')
    const start = localStorage.getItem('drpet_planStart')
    if (plan === 'true' && start) {
      setHasPlan(true)
      setPlanStart(start)
    }
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
              <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
            </svg>
            <h3 className="text-white font-bold text-base">AI 換食計劃</h3>
          </div>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">目前的飲食計畫是最佳的嗎？讓 AI 根據毛孩現況為您客製化推薦</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 relative z-10 group-hover:bg-white group-hover:text-black transition-all">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </button>
    )
  }

  return (
    <DietPlanActive
      petId={petId}
      startDate={planStart}
      onEnd={endPlan}
    />
  )
}
