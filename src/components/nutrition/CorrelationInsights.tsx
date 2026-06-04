'use client'

// 關聯分析區塊：顯示 /api/analyze 寫入的 AIInsight（症狀 × 產品的可疑觸發因素分析）。
// 配合營養分析頁，讓既有的 AIInsight 資料有顯示端。

import { useEffect, useState } from 'react'
import { parseJson } from '@/lib/utils'

interface AIInsight {
  id: string
  symptomType: string | null
  suspectedTriggers: string
  helpfulFactors: string
  confidence: string
  rationale: string | null
  recommendedActions: string
  createdAt: string
}

// suspectedTriggers 可能是字串陣列（seed）或物件陣列（AI 產出），統一取出可讀名稱
function triggerName(t: unknown): string {
  if (typeof t === 'string') return t
  if (t && typeof t === 'object' && 'name' in t) return String((t as { name: unknown }).name)
  return ''
}

const CONFIDENCE_LABEL: Record<string, string> = {
  low: '低', medium: '中', high: '高',
}

export default function CorrelationInsights({ petId }: { petId: string }) {
  const [insight, setInsight] = useState<AIInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!petId) return
    setLoading(true)
    setLoaded(false)
    fetch(`/api/analyze?petId=${petId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AIInsight | null) => setInsight(data))
      .catch(() => setInsight(null))
      .finally(() => { setLoading(false); setLoaded(true) })
  }, [petId])

  if (!petId) return null

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">關聯分析</h2>
      </div>

      {loading && (
        <div className="bg-white rounded-[28px] border-2 border-slate-900/5 shadow-sm p-6 flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#D98A53] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">載入關聯分析…</p>
        </div>
      )}

      {!loading && loaded && !insight && (
        <div className="bg-white rounded-[28px] border-2 border-slate-900/5 shadow-sm p-6 flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FEF1E2] flex items-center justify-center text-[#D98A53] text-2xl">🔍</div>
          <p className="font-bold text-slate-800">尚無關聯分析</p>
          <p className="text-sm font-medium text-slate-400 leading-relaxed">
            持續記錄症狀與飲食後，系統會分析可能的觸發因素與有益因素
          </p>
        </div>
      )}

      {!loading && insight && (() => {
        const triggers = parseJson<unknown[]>(insight.suspectedTriggers, [])
          .map(triggerName)
          .filter(Boolean)
        const helpful = parseJson<string[]>(insight.helpfulFactors, [])
        const actions = parseJson<string[]>(insight.recommendedActions, [])

        return (
          <div className="bg-white rounded-[28px] border-2 border-slate-900/5 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">
                {new Date(insight.createdAt).toLocaleDateString('zh-TW')} 更新
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FEF1E2] text-[#D98A53]">
                信心度 {CONFIDENCE_LABEL[insight.confidence] ?? insight.confidence}
              </span>
            </div>

            {insight.rationale && (
              <p className="text-sm font-medium text-slate-600 leading-relaxed">{insight.rationale}</p>
            )}

            {triggers.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">可疑觸發因素</p>
                <div className="flex flex-wrap gap-1.5">
                  {triggers.map((t, i) => (
                    <span key={i} className="text-xs font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]/50 px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {helpful.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">有益因素</p>
                <div className="flex flex-wrap gap-1.5">
                  {helpful.map((h, i) => (
                    <span key={i} className="text-xs font-bold bg-[#EAF5ED] text-[#16A34A] border border-[#B7E4C7] px-2.5 py-1 rounded-full">{h}</span>
                  ))}
                </div>
              </div>
            )}

            {actions.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">建議行動</p>
                <ul className="space-y-1.5">
                  {actions.map((a, i) => (
                    <li key={i} className="text-sm font-medium text-slate-600 leading-relaxed flex gap-2">
                      <span className="text-[#D98A53] shrink-0">›</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
