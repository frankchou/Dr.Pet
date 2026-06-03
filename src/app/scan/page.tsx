'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { parseJson } from '@/lib/utils'

/* ── 型別 ─────────────────────────────────────────── */

interface Pet {
  id: string
  name: string
  species: string
}

interface AnalysisRecord {
  id: string
  verdict: string
  suitabilityScore?: number
  summary: string
  productName?: string | null
  resultJson: string
  createdAt: string
}

interface AnalysisResult {
  verdict: string
  suitabilityScore?: number
  productName?: string
  brandName?: string
  summary: string
  extractedIngredients?: string[]
  concerns?: { ingredient: string; reason: string }[]
  positives?: { ingredient: string; reason: string }[]
}

/* ── 判定配置 ─────────────────────────────────────── */

const VERDICTS = {
  safe:    { label: '適合',    fill: '#E2F3E4', text: '#2D6A4F', border: '#B7E4C7', iconPath: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3' },
  caution: { label: '謹慎',    fill: '#FEF1E2', text: '#9A6233', border: '#F3D9BE', iconPath: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01' },
  danger:  { label: '不建議',  fill: '#FEF2F2', text: '#991B1B', border: '#FCA5A5', iconPath: 'M10 14l2-2m0 0 2-2m-2 2-2-2m2 2 2 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
} as const

type VerdictKey = keyof typeof VERDICTS

const verdictCfg = (v: string) => VERDICTS[(v as VerdictKey) in VERDICTS ? (v as VerdictKey) : 'caution']

/* ── SVG 圖示（inline，無外部依賴）────────────────── */

function IconCamera({ size = 20, strokeWidth = 2.2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function IconSearch({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function IconX({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function IconFileText({ size = 26, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconAlertTriangle({ size = 13, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCheck({ size = 13, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconImage({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

/* ── 判定圖示（依 verdict 渲染）────────────────────── */

function VerdictIcon({ verdict, size = 22 }: { verdict: string; size?: number }) {
  const cfg = verdictCfg(verdict)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={cfg.text} strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d={cfg.iconPath} />
    </svg>
  )
}

/* ── 主元件 ──────────────────────────────────────── */

type Stage = 'capture' | 'analyzing' | 'result'

export default function ScanPage() {
  const [currentPetId, setCurrentPetId] = useState('')
  const [petName, setPetName] = useState('')
  const [pets, setPets] = useState<Pet[]>([])
  const [history, setHistory] = useState<AnalysisRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Modal
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<Stage>('capture')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addedToTrial, setAddedToTrial] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // 捲動鎖定
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // 從 localStorage 取得 petId，並載入 pets
  useEffect(() => {
    fetch('/api/pets')
      .then(r => r.json())
      .then((data: Pet[]) => {
        setPets(data)
        const stored = typeof window !== 'undefined' ? localStorage.getItem('drpet_currentPetId') : null
        const id = stored && data.find(p => p.id === stored) ? stored : data[0]?.id ?? ''
        setCurrentPetId(id)
        setPetName(data.find(p => p.id === id)?.name ?? '')
      })
      .catch(() => { /* 靜默降級 */ })
  }, [])

  const loadHistory = useCallback(async (petId: string) => {
    if (!petId) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/instant-analyze?petId=${petId}`)
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentPetId) loadHistory(currentPetId)
  }, [currentPetId, loadHistory])

  const openModal = () => {
    setStage('capture')
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setResult(null)
    setError(null)
    setAddedToTrial(false)
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    setResult(null)
    setError(null)
    setAddedToTrial(false)
    loadHistory(currentPetId)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
    e.target.value = ''
  }

  const handleAnalyze = async () => {
    if (!file || !currentPetId) return
    setStage('analyzing')
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('petId', currentPetId)
      const res = await fetch('/api/instant-analyze', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '分析失敗')
      setResult(data as AnalysisResult)
      setStage('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失敗，請再試一次')
      setStage('capture')
    }
  }

  const handleAddToTrial = async () => {
    if (!result || !currentPetId) return
    try {
      await fetch('/api/pet-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: currentPetId,
          productName: result.productName || '未知產品',
          listType: 'trial',
        }),
      })
      setAddedToTrial(true)
    } catch {
      /* 靜默降級 */
    }
  }

  const formatDate = (iso: string): string => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#FEF1E2] flex items-center justify-center text-[#D98A53] shrink-0">
            <IconCamera size={20} strokeWidth={2.2} />
          </div>
          <h1 className="text-xl font-bold tracking-tight truncate">即時分析</h1>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-[#111111] text-white px-4 py-2.5 rounded-full text-sm font-bold hover:bg-black transition-colors shadow-lg shadow-black/10 shrink-0"
        >
          <IconCamera size={16} strokeWidth={2.5} />
          AI 即時分析
        </button>
      </div>

      {/* 歷史記錄 */}
      <div className="max-w-2xl mx-auto w-full">
        {petName && (
          <p className="text-sm font-bold text-slate-400 mb-4 px-1">{petName} 的分析紀錄</p>
        )}

        {historyLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">載入中…</div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="w-16 h-16 rounded-3xl bg-[#FEF1E2] flex items-center justify-center mx-auto mb-4 text-[#D98A53]">
              <IconCamera size={28} />
            </div>
            <p className="text-sm font-bold">尚無分析記錄</p>
            <p className="text-xs text-slate-300 mt-1">點擊「AI 即時分析」開始</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((rec) => {
              const parsed = parseJson<{ suitabilityScore?: number }>(rec.resultJson, {})
              const score = rec.suitabilityScore ?? parsed.suitabilityScore
              const cfg = verdictCfg(rec.verdict)
              return (
                <button
                  key={rec.id}
                  onClick={openModal}
                  className="w-full text-left bg-white border-2 border-slate-900/5 rounded-[24px] p-3.5 shadow-sm hover:shadow-md transition-shadow flex gap-3.5 items-center"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-slate-900/5"
                    style={{ backgroundColor: cfg.fill }}
                  >
                    <IconFileText size={26} color={cfg.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cfg.fill, color: cfg.text }}
                      >
                        <VerdictIcon verdict={rec.verdict} size={11} />
                        {cfg.label}{score !== undefined ? ` ${score}%` : ''}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{formatDate(rec.createdAt)}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-snug line-clamp-2">{rec.summary}</p>
                  </div>
                  <span className="text-slate-300 shrink-0">
                    <IconChevronRight size={16} />
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 分析 Modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full md:max-w-md bg-white rounded-t-[32px] md:rounded-[32px] max-h-[88vh] overflow-y-auto hide-scrollbar animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-base flex items-center gap-2">
                <span className="text-[#D98A53]"><IconSearch size={18} /></span>
                AI 成分即時分析
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="p-5">
              {/* Stage: capture / analyzing */}
              {stage !== 'result' && (
                <>
                  {/* 上傳／預覽區 */}
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 h-52 flex flex-col items-center justify-center gap-2 mb-5 overflow-hidden">
                    {stage === 'analyzing' ? (
                      <>
                        <div className="w-12 h-12 rounded-full border-4 border-[#D98A53] border-t-transparent animate-spin" />
                        <p className="text-sm font-bold text-slate-500 mt-2">AI 分析成分中…</p>
                      </>
                    ) : preview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={preview} alt="預覽" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300">
                          <IconCamera size={28} />
                        </div>
                        <p className="text-sm font-bold text-slate-500">拍攝或上傳成分標籤照片</p>
                        <p className="text-[11px] font-medium text-slate-400">JPG / PNG / WebP，20MB 以內</p>
                      </>
                    )}
                  </div>

                  {/* 錯誤訊息 */}
                  {error && (
                    <div className="bg-[#FEF2F2] rounded-2xl p-3 text-sm text-[#991B1B] mb-4">
                      {error}
                    </div>
                  )}

                  {stage === 'capture' && (
                    <>
                      {/* 拍照 / 相簿按鈕 */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <label className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
                          <IconCamera size={16} />
                          拍照
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                        <label className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
                          <IconImage size={16} />
                          從相簿選擇
                          <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>

                      {/* 開始分析 */}
                      <button
                        onClick={handleAnalyze}
                        disabled={!file}
                        className="w-full bg-[#111111] text-white rounded-2xl py-4 font-bold text-sm hover:bg-black transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-30"
                      >
                        <IconSearch size={16} />
                        開始 AI 分析
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Stage: result */}
              {stage === 'result' && result && (() => {
                const cfg = verdictCfg(result.verdict)
                return (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* 判定卡 */}
                    <div
                      className="rounded-3xl p-5 mb-4"
                      style={{ backgroundColor: cfg.fill, border: `1px solid ${cfg.border}` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <VerdictIcon verdict={result.verdict} size={22} />
                        <span className="text-base font-bold" style={{ color: cfg.text }}>{cfg.label}</span>
                        {result.suitabilityScore !== undefined && (
                          <span className="text-2xl font-bold ml-1" style={{ color: cfg.text }}>{result.suitabilityScore}%</span>
                        )}
                      </div>
                      {result.productName && (
                        <p className="text-sm font-bold mb-1" style={{ color: cfg.text }}>{result.productName}</p>
                      )}
                      <p className="text-xs font-medium leading-relaxed" style={{ color: cfg.text }}>{result.summary}</p>
                    </div>

                    {/* 識別到的成分 */}
                    {result.extractedIngredients && result.extractedIngredients.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-slate-500 mb-2">識別到的成分</p>
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {result.extractedIngredients.map((ing) => (
                            <span key={ing} className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">
                              {ing}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {/* 需留意 */}
                    {result.concerns && result.concerns.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-[#B91C1C] mb-2 flex items-center gap-1">
                          <IconAlertTriangle size={13} strokeWidth={2.5} />
                          需留意
                        </p>
                        <div className="space-y-2 mb-5">
                          {result.concerns.map((c, i) => (
                            <div key={i} className="bg-[#FEF2F2] border border-[#FCA5A5]/50 rounded-2xl px-3 py-2.5">
                              <p className="text-xs font-bold text-slate-800">{c.ingredient}</p>
                              <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-relaxed">{c.reason}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* 有益成分 */}
                    {result.positives && result.positives.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-[#2D6A4F] mb-2 flex items-center gap-1">
                          <IconCheck size={13} strokeWidth={2.5} />
                          有益成分
                        </p>
                        <div className="space-y-2 mb-6">
                          {result.positives.map((p, i) => (
                            <div key={i} className="bg-[#E2F3E4]/60 border border-[#B7E4C7]/60 rounded-2xl px-3 py-2.5">
                              <p className="text-xs font-bold text-slate-800">{p.ingredient}</p>
                              <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-relaxed">{p.reason}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* 加入試用清單 */}
                    {addedToTrial ? (
                      <div className="w-full mb-2 flex items-center justify-center gap-2 bg-[#E2F3E4] text-[#2D6A4F] rounded-2xl py-3.5 text-sm font-bold">
                        <IconCheck size={16} strokeWidth={2.5} />
                        已加入試用清單
                      </div>
                    ) : (
                      <button
                        onClick={handleAddToTrial}
                        className="w-full mb-2 flex items-center justify-center gap-2 bg-[#FEF1E2] text-[#D98A53] rounded-2xl py-3.5 text-sm font-bold hover:bg-[#FCE7D2] transition-colors"
                      >
                        <IconPlus size={16} />
                        加入試用清單
                      </button>
                    )}

                    <button
                      onClick={closeModal}
                      className="w-full bg-slate-100 text-slate-600 rounded-2xl py-3 text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                      完成，返回紀錄列表
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
