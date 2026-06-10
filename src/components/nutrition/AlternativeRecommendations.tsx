'use client'

// AI 產品替代推薦：針對成分分析中「有毒 / 警示」的產品，呼叫 /api/recommend
// 列出「目前產品 vs 建議替換」。自舊 /analysis 頁移植，重新以飲食報告的
// 棕色系卡片風格呈現，與 IngredientAnalysis（營養綜合分析表）視覺一致。
//
// 自行向 /api/analysis 取得風險產品清單（與 IngredientAnalysis 同一資料源），
// 避免與父層耦合；無風險產品時不顯示任何內容。

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProductRecommendation } from '@/app/api/recommend/route'

type RiskLevel = 'danger' | 'warning' | 'caution'

interface RiskyProduct {
  name: string
  brand?: string
  type: string
  risks: string[]
  riskLevel: RiskLevel
}

// /api/analysis 回傳結構（僅取本元件所需欄位）
interface AnalysisMatched {
  displayName: string
  foundIn: string[]
}
interface AnalysisProduct {
  id: string
  name: string
  brand: string | null
  type: string
}
interface AnalysisData {
  result: {
    toxicItems: AnalysisMatched[]
    warningItems: AnalysisMatched[]
    analyzedProducts: AnalysisProduct[]
  }
}

export default function AlternativeRecommendations({ petId }: { petId: string }) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [recResult, setRecResult] = useState<ProductRecommendation[] | null>(null)
  const [recSavedAt, setRecSavedAt] = useState<string | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recSavedLoading, setRecSavedLoading] = useState(false)
  const [recError, setRecError] = useState('')

  // 載入成分分析（取得風險產品）與已儲存的推薦結果
  useEffect(() => {
    if (!petId) return
    fetch(`/api/analysis?petId=${petId}`)
      .then(r => (r.ok ? r.json() : null))
      .then((json: AnalysisData | null) => { if (json?.result) setAnalysis(json) })
      .catch(() => {})

    setRecSavedLoading(true)
    fetch(`/api/recommend?petId=${petId}`)
      .then(r => (r.ok ? r.json() : null))
      .then((json: { recommendations?: ProductRecommendation[]; savedAt?: string } | null) => {
        if (json?.recommendations) {
          setRecResult(json.recommendations)
          setRecSavedAt(json.savedAt ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setRecSavedLoading(false))
  }, [petId])

  // 由有毒 / 警示成分彙整出風險產品清單
  const riskyProducts = useMemo<RiskyProduct[]>(() => {
    const result = analysis?.result
    if (!result) return []
    const map = new Map<string, RiskyProduct>()
    const priority: Record<RiskLevel, number> = { danger: 3, warning: 2, caution: 1 }
    const add = (productDisplayName: string, ingredientName: string, level: RiskLevel) => {
      const existing = map.get(productDisplayName)
      if (existing) {
        if (!existing.risks.includes(ingredientName)) existing.risks.push(ingredientName)
        if (priority[level] > priority[existing.riskLevel]) existing.riskLevel = level
      } else {
        const prod = result.analyzedProducts.find(
          p => `${p.brand ? p.brand + ' ' : ''}${p.name}` === productDisplayName || p.name === productDisplayName,
        )
        map.set(productDisplayName, {
          name: prod?.name || productDisplayName,
          brand: prod?.brand ?? undefined,
          type: prod?.type || 'other',
          risks: [ingredientName],
          riskLevel: level,
        })
      }
    }
    result.toxicItems.forEach(item => item.foundIn.forEach(p => add(p, item.displayName, 'danger')))
    result.warningItems.forEach(item => item.foundIn.forEach(p => add(p, item.displayName, 'warning')))
    return Array.from(map.values())
  }, [analysis])

  const runRecommend = useCallback(async () => {
    if (!petId || riskyProducts.length === 0) return
    setRecLoading(true)
    setRecError('')
    setRecResult(null)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, riskyProducts }),
      })
      const json = await res.json() as { recommendations?: ProductRecommendation[]; savedAt?: string; error?: string }
      if (!res.ok) { setRecError(json.error || '推薦失敗'); return }
      setRecResult(json.recommendations ?? [])
      setRecSavedAt(json.savedAt ?? null)
    } catch {
      setRecError('網路錯誤，請稍後再試')
    } finally {
      setRecLoading(false)
    }
  }, [petId, riskyProducts])

  // 無風險產品且無已儲存結果時，整塊不顯示
  if (riskyProducts.length === 0 && !recResult && !recLoading && !recSavedLoading) return null

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">AI 產品替代推薦</h2>
      </div>

      <div className="bg-white rounded-[28px] border-2 border-slate-900/5 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-medium text-slate-400 leading-relaxed">
            針對成分分析中的有毒 / 警示產品，依寵物健康狀況推薦更安全的替代產品方向。
          </p>
        </div>

        {recSavedLoading && (
          <div className="px-5 pb-5 text-center">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-[#D98A53] rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!recSavedLoading && !recResult && !recLoading && riskyProducts.length > 0 && (
          <div className="px-5 pb-5">
            <button
              onClick={runRecommend}
              className="w-full py-4 bg-gradient-to-r from-[#D98A53] to-[#E8A070] text-white rounded-2xl font-bold text-sm shadow-sm active:opacity-90"
            >
              ✨ 取得 AI 替代品建議
            </button>
            {recError && <p className="text-xs font-bold text-red-500 mt-2 text-center">{recError}</p>}
          </div>
        )}

        {recLoading && (
          <div className="px-5 pb-5 text-center space-y-2">
            <div className="w-7 h-7 border-2 border-[#D98A53] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">AI 正在分析替代品建議…</p>
          </div>
        )}

        {recResult && recResult.length > 0 && (
          <div className="divide-y divide-slate-100">
            {recResult.map((rec, ri) => {
              const prodInfo = riskyProducts.find(
                p => p.name === rec.forProduct || `${p.brand ? p.brand + ' ' : ''}${p.name}` === rec.forProduct,
              )
              const isDanger = prodInfo?.riskLevel === 'danger'
              return (
                <div key={ri} className="px-5 pt-4 pb-4 space-y-3">
                  {/* 目前使用、有問題的產品 */}
                  <div className={`rounded-2xl p-4 border ${isDanger ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFF7ED] border-[#FED7AA]'}`}>
                    <p className={`text-[11px] font-bold mb-1 ${isDanger ? 'text-[#DC2626]' : 'text-[#C2410C]'}`}>
                      {isDanger ? '⛔ 有毒成分 — 建議替換' : '⚠️ 警示成分 — 建議替換'}
                    </p>
                    <p className="text-sm font-bold text-slate-900">{prodInfo?.name || rec.forProduct}</p>
                    {prodInfo?.brand && <p className="text-xs font-medium text-slate-500 mt-0.5">{prodInfo.brand}</p>}
                    {prodInfo?.risks && prodInfo.risks.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 items-center">
                        <span className="text-[10px] text-slate-400">問題成分：</span>
                        {prodInfo.risks.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isDanger ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 建議替代產品 */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 mb-1.5 px-0.5">推薦替代產品</p>
                    <div className="space-y-2">
                      {rec.alternatives.map((alt, ai) => (
                        <div key={ai} className="bg-[#FEF9F4] border border-[#F0E3D6] rounded-2xl p-4 space-y-1.5">
                          <p className="text-sm font-bold text-[#C4714A]">{alt.productName}</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{alt.reason}</p>
                          {alt.keyFeatures.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {alt.keyFeatures.map((f, fi) => (
                                <span key={fi} className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ {f}</span>
                              ))}
                            </div>
                          )}
                          {alt.avoid.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {alt.avoid.map((a, ai2) => (
                                <span key={ai2} className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">✕ 避開 {a}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-400 leading-relaxed">💡 {alt.searchTip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
            <div className="px-5 py-3 flex items-center justify-between gap-2">
              {recSavedAt && (
                <p className="text-[10px] font-bold text-slate-300">
                  {new Date(recSavedAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <button
                onClick={runRecommend}
                disabled={recLoading}
                className="text-xs font-bold text-[#D98A53] ml-auto disabled:opacity-40"
              >
                {recLoading ? '更新中…' : '重新取得建議'}
              </button>
            </div>
          </div>
        )}

        {recResult && recResult.length === 0 && !recLoading && (
          <div className="px-5 pb-5">
            <p className="text-sm font-bold text-green-600 text-center py-3">目前無需替換的風險產品</p>
          </div>
        )}
      </div>
    </div>
  )
}
