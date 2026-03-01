'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Pet {
  id: string
  name: string
  species: string
  avatar?: string | null
}

interface AnalysisRecord {
  id: string
  verdict: string
  summary: string
  resultJson: string
  imagePath?: string | null
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

const PRODUCT_TYPES = [
  { value: 'feed',       label: '飼料' },
  { value: 'can',        label: '罐頭' },
  { value: 'snack',      label: '零食' },
  { value: 'supplement', label: '保健品' },
  { value: 'dental',     label: '牙膏牙粉' },
  { value: 'shampoo',    label: '洗毛精' },
  { value: 'other',      label: '其他' },
]

const SPECIES_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱' }

const VERDICT_CONFIG = {
  safe:    { label: '適合',   bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  badge: 'bg-green-100 text-green-700',  icon: '✅' },
  caution: { label: '謹慎',   bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', icon: '⚠️' },
  danger:  { label: '不建議', bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    badge: 'bg-red-100 text-red-700',      icon: '⛔' },
}

const verdictCfg = (v: string) => VERDICT_CONFIG[v as keyof typeof VERDICT_CONFIG] ?? VERDICT_CONFIG.caution

export default function ScanPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [currentPetId, setCurrentPetId] = useState('')
  const [history, setHistory] = useState<AnalysisRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Upload modal
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Save-to-trial form
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveProductName, setSaveProductName] = useState('')
  const [saveBrand, setSaveBrand] = useState('')
  const [saveType, setSaveType] = useState('feed')
  const [saveReason, setSaveReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedToTrial, setSavedToTrial] = useState(false)

  // Detail modal
  const [detailRecord, setDetailRecord] = useState<AnalysisRecord | null>(null)

  // Body scroll lock
  useEffect(() => {
    const open = showUpload || !!detailRecord
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showUpload, detailRecord])

  // Load pets
  useEffect(() => {
    fetch('/api/pets').then(r => r.json()).then((data: Pet[]) => {
      setPets(data)
      const stored = localStorage.getItem('drpet_currentPetId')
      const first = stored && data.find(p => p.id === stored) ? stored : data[0]?.id
      if (first) setCurrentPetId(first)
    })
  }, [])

  // Load history
  const loadHistory = useCallback(async (petId: string) => {
    if (!petId) return
    setHistoryLoading(true)
    const res = await fetch(`/api/instant-analyze?petId=${petId}`)
    const data = await res.json()
    setHistory(Array.isArray(data) ? data : [])
    setHistoryLoading(false)
  }, [])

  useEffect(() => {
    if (currentPetId) loadHistory(currentPetId)
  }, [currentPetId, loadHistory])

  const openUpload = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setShowSaveForm(false)
    setSavedToTrial(false)
    setSaving(false)
    setShowUpload(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
    const url = URL.createObjectURL(f)
    setPreview(url)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const handleAnalyze = async () => {
    if (!file || !currentPetId) return
    setAnalyzing(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('petId', currentPetId)
      const res = await fetch('/api/instant-analyze', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '分析失敗')
      setResult(data)
      setSaveProductName(data.productName || '')
      setSaveBrand(data.brandName || '')
      setSaveType('feed')
      setSaveReason('')
      setShowSaveForm(false)
      setSavedToTrial(false)
      // Refresh history
      loadHistory(currentPetId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失敗')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/instant-analyze/${id}`, { method: 'DELETE' })
    setHistory(prev => prev.filter(r => r.id !== id))
    setDetailRecord(null)
  }

  const handleSaveToTrial = async () => {
    if (!saveProductName.trim() || !currentPetId) return
    setSaving(true)
    try {
      // Create product record
      const prodRes = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: saveType,
          name: saveProductName.trim(),
          brand: saveBrand.trim() || null,
        }),
      })
      const prod = await prodRes.json()
      if (!prodRes.ok) throw new Error(prod.error || '建立產品失敗')

      // Add to trial list
      await fetch('/api/pet-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: currentPetId,
          productId: prod.id,
          listType: 'trial',
          trialReason: saveReason.trim() || null,
        }),
      })

      setSavedToTrial(true)
      setShowSaveForm(false)
    } catch {
      // keep form open on error
    } finally {
      setSaving(false)
    }
  }

  const closeUpload = () => {
    setShowUpload(false)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    setResult(null)
    setError(null)
    setShowSaveForm(false)
    setSavedToTrial(false)
    setSaving(false)
  }

  const currentPet = pets.find(p => p.id === currentPetId)

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* ── Header ── */}
      <div className="bg-white px-4 pt-12 pb-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">即時分析</h1>
          <button onClick={openUpload}
            className="flex items-center gap-1.5 bg-[#4F7CFF] text-white px-3 py-1.5 rounded-xl text-sm font-medium active:opacity-90">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            新增分析
          </button>
        </div>

        {/* Pet selector */}
        {pets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pets.map(p => (
              <button key={p.id} onClick={() => setCurrentPetId(p.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  currentPetId === p.id ? 'bg-[#4F7CFF] text-white border-[#4F7CFF]' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                <span>{SPECIES_EMOJI[p.species] || '🐾'}</span>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── History list ── */}
      <div className="px-4 py-3">
        {currentPet && (
          <p className="text-xs text-gray-400 mb-3 px-1">{currentPet.name} 的分析紀錄</p>
        )}

        {historyLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">載入中…</div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📷</div>
            <p className="text-sm font-medium">尚無分析紀錄</p>
            <p className="text-xs text-gray-300 mt-1">拍照或上傳成分標籤，即時了解產品是否適合你的寵物</p>
            <button onClick={openUpload}
              className="mt-5 px-5 py-2.5 bg-[#4F7CFF] text-white rounded-xl text-sm font-medium active:opacity-90">
              開始第一次分析
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map(rec => {
              const cfg = verdictCfg(rec.verdict)
              const date = new Date(rec.createdAt)
              const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
              const parsedScore: number | undefined = (() => { try { return JSON.parse(rec.resultJson)?.suitabilityScore } catch { return undefined } })()
              return (
                <button key={rec.id} onClick={() => setDetailRecord(rec)}
                  className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex gap-3 active:opacity-80">
                  {/* Image thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center relative">
                    <span className="text-2xl absolute pointer-events-none select-none">📷</span>
                    {rec.imagePath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rec.imagePath} alt="" className="w-full h-full object-cover relative"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                        {cfg.icon} {cfg.label}
                        {parsedScore !== undefined && <span className="ml-1">{parsedScore}%</span>}
                      </span>
                      <span className="text-[10px] text-gray-400">{dateStr}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{rec.summary}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    className="w-4 h-4 text-gray-300 shrink-0 self-center">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Upload & Analyze Modal ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-[76px]"
          onClick={closeUpload}>
          <div className="w-full max-w-[480px] bg-white rounded-3xl flex flex-col overflow-hidden"
            style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="px-4 pt-5 pb-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">🔍 成分即時分析</h2>
              <button onClick={closeUpload} className="text-gray-400 text-xl w-7 h-7 flex items-center justify-center">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Hidden inputs */}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={handleFileChange} />
              <input ref={galleryInputRef} type="file" accept="image/*"
                className="hidden" onChange={handleFileChange} />

              {/* Preview or pick zone */}
              {preview ? (
                <div className="rounded-2xl overflow-hidden bg-gray-100 h-52">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 h-44 flex flex-col items-center justify-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                    className="w-10 h-10 text-gray-200 mb-1">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <p className="text-xs text-gray-400">選擇成分標籤照片進行分析</p>
                  <p className="text-[10px] text-gray-300">JPG、PNG、WebP，20MB 以內</p>
                </div>
              )}

              {/* Camera / Gallery buttons */}
              {!result && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={analyzing}
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 active:bg-gray-100 disabled:opacity-40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    拍照
                  </button>
                  <button
                    disabled={analyzing}
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 active:bg-gray-100 disabled:opacity-40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    從相簿選擇
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* Result */}
              {result && (() => {
                const cfg = verdictCfg(result.verdict)
                return (
                  <div className={`rounded-2xl border p-4 space-y-3 ${cfg.bg} ${cfg.border}`}>
                    {/* Verdict + product name */}
                    <div className="flex items-start gap-2">
                      <span className="text-2xl shrink-0">{cfg.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
                          {result.suitabilityScore !== undefined && (
                            <span className={`text-xl font-extrabold ${cfg.text}`}>{result.suitabilityScore}%</span>
                          )}
                          {result.productName && (
                            <span className="text-xs text-gray-500 font-medium truncate">{result.productName}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{result.summary}</p>
                      </div>
                    </div>

                    {/* Ingredients */}
                    {result.extractedIngredients && result.extractedIngredients.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 mb-1.5">識別到的成分</p>
                        <div className="flex flex-wrap gap-1">
                          {result.extractedIngredients.slice(0, 12).map((ing, i) => (
                            <span key={i} className="text-[10px] bg-white/70 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{ing}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Concerns */}
                    {result.concerns && result.concerns.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-red-500 mb-1.5">⚠️ 需留意</p>
                        <div className="space-y-1.5">
                          {result.concerns.map((c, i) => (
                            <div key={i} className="bg-white/60 rounded-lg px-2.5 py-2">
                              <p className="text-xs font-medium text-gray-800">{c.ingredient}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">{c.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Positives */}
                    {result.positives && result.positives.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-green-600 mb-1.5">✅ 有益成分</p>
                        <div className="space-y-1.5">
                          {result.positives.map((p, i) => (
                            <div key={i} className="bg-white/60 rounded-lg px-2.5 py-2">
                              <p className="text-xs font-medium text-gray-800">{p.ingredient}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">{p.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Save-to-trial success banner */}
              {savedToTrial && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <span className="text-green-500 text-base">✅</span>
                  <p className="text-xs text-green-700 font-medium">已加入試用清單！</p>
                </div>
              )}

              {/* Save-to-trial button (shown when result exists and not yet saved) */}
              {result && !savedToTrial && !showSaveForm && (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#4F7CFF]/30 bg-blue-50 text-[#4F7CFF] text-sm font-medium active:opacity-80">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  加入試用清單
                </button>
              )}

              {/* Save-to-trial form */}
              {result && showSaveForm && !savedToTrial && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#4F7CFF]">🧪 加入試用清單</p>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">產品名稱 *</label>
                    <input
                      value={saveProductName}
                      onChange={e => setSaveProductName(e.target.value)}
                      placeholder="輸入產品名稱"
                      className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">品牌</label>
                      <input
                        value={saveBrand}
                        onChange={e => setSaveBrand(e.target.value)}
                        placeholder="品牌名稱"
                        className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">類別</label>
                      <select
                        value={saveType}
                        onChange={e => setSaveType(e.target.value)}
                        className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40">
                        {PRODUCT_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">試用原因 <span className="text-gray-300">（選填）</span></label>
                    <input
                      value={saveReason}
                      onChange={e => setSaveReason(e.target.value)}
                      placeholder="例：AI 分析適合，想觀察反應"
                      className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/40"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 text-sm active:opacity-80">
                      取消
                    </button>
                    <button
                      onClick={handleSaveToTrial}
                      disabled={!saveProductName.trim() || saving}
                      className="flex-1 py-2.5 rounded-xl bg-[#4F7CFF] text-white text-sm font-medium disabled:opacity-40 active:opacity-90">
                      {saving ? '儲存中…' : '確認加入'}
                    </button>
                  </div>
                </div>
              )}

              {/* Analyze button */}
              {!result && (
                <button
                  onClick={handleAnalyze}
                  disabled={!file || analyzing}
                  className="w-full bg-[#4F7CFF] text-white rounded-xl py-3.5 font-medium text-sm disabled:opacity-40 active:opacity-90 flex items-center justify-center gap-2">
                  {analyzing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} strokeDasharray="60" strokeDashoffset="15" strokeLinecap="round" />
                      </svg>
                      AI 分析中…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                      </svg>
                      開始分析
                    </>
                  )}
                </button>
              )}

              {result && (
                <button onClick={closeUpload}
                  className="w-full bg-gray-100 text-gray-600 rounded-xl py-3 font-medium text-sm active:opacity-80">
                  完成，返回紀錄列表
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailRecord && (() => {
        const rec = detailRecord
        const parsed: AnalysisResult = (() => { try { return JSON.parse(rec.resultJson) } catch { return {} as AnalysisResult } })()
        const cfg = verdictCfg(rec.verdict)
        const date = new Date(rec.createdAt)
        const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-[76px]"
            onClick={() => setDetailRecord(null)}>
            <div className="w-full max-w-[480px] bg-white rounded-3xl flex flex-col overflow-hidden"
              style={{ maxHeight: '85vh' }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-4 pt-5 pb-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">分析詳情</h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">{dateStr}</p>
                </div>
                <button onClick={() => setDetailRecord(null)} className="text-gray-400 text-xl w-7 h-7 flex items-center justify-center">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Image */}
                {rec.imagePath && (
                  <div className="rounded-xl overflow-hidden bg-gray-100 h-48 flex items-center justify-center relative">
                    <span className="text-4xl absolute pointer-events-none select-none">📷</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rec.imagePath} alt="" className="w-full h-full object-contain relative"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}

                {/* Verdict + summary */}
                <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{cfg.icon}</span>
                    <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
                    {parsed.suitabilityScore !== undefined && (
                      <span className={`text-2xl font-extrabold ${cfg.text}`}>{parsed.suitabilityScore}%</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{rec.summary}</p>
                </div>

                {/* Ingredients */}
                {parsed.extractedIngredients && parsed.extractedIngredients.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">識別到的成分</p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.extractedIngredients.map((ing, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ing}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concerns */}
                {parsed.concerns && parsed.concerns.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 mb-2">⚠️ 需留意的成分</p>
                    <div className="space-y-2">
                      {parsed.concerns.map((c, i) => (
                        <div key={i} className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                          <p className="text-xs font-semibold text-gray-800">{c.ingredient}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{c.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Positives */}
                {parsed.positives && parsed.positives.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 mb-2">✅ 有益成分</p>
                    <div className="space-y-2">
                      {parsed.positives.map((p, i) => (
                        <div key={i} className="bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                          <p className="text-xs font-semibold text-gray-800">{p.ingredient}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{p.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete */}
                <button onClick={() => handleDelete(rec.id)}
                  className="w-full border border-red-100 text-red-400 rounded-xl py-2.5 text-xs font-medium active:opacity-80 mt-2">
                  刪除此紀錄
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
