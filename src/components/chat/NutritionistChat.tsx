'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { parseJson } from '@/lib/utils'

/* ── 型別 ─────────────────────────────────────────── */

interface Pet {
  id: string
  name: string
  mainProblems: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  // modal 內使用時可隱藏頂部標題列（由 modal header 取代）
  showHeader?: boolean
  // 輸入列底部留白：頁面版需避開 BottomNav（pb-28），modal 版貼齊底部即可
  inputPaddingClassName?: string
}

/* ── PurePaw Logo SVG ────────────────────────────── */

function PurePawLogo({ width = 28, height = 28 }: { width?: number; height?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/app-logo.png" alt="PurePaw" width={width} height={height} className="rounded-xl object-cover" />
  )
}

/* ── SVG 圖示 ────────────────────────────────────── */

function IconInfo({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function IconSparkles({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
    </svg>
  )
}

function IconMic({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function IconSend({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

/* ── 共用對話元件 ─────────────────────────────────────
   AI 諮詢對話 UI/邏輯抽出，讓 /nutritionist 頁與日誌頁浮動 modal 共用。
   接同一支 /api/chat、共用寵物 context 與歷史記錄。 */

export default function NutritionistChat({
  showHeader = true,
  inputPaddingClassName = 'pb-28 md:pb-4',
}: Props) {
  const [pets, setPets] = useState<Pet[]>([])
  const [activePetId, setActivePetId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const empty = messages.length === 0

  // 取得寵物清單
  useEffect(() => {
    fetch('/api/pets')
      .then(r => r.json())
      .then((data: Pet[]) => {
        // 401（未登入 / session 過期）回傳的是 { error }，先正規化避免當成陣列操作
        const list = Array.isArray(data) ? data : []
        setPets(list)
        const stored = typeof window !== 'undefined' ? localStorage.getItem('drpet_currentPetId') : null
        const id = stored && list.find(p => p.id === stored) ? stored : list[0]?.id ?? ''
        setActivePetId(id)
      })
      .catch(() => { /* 靜默降級 */ })
  }, [])

  // 切換寵物時載入歷史對話記錄
  useEffect(() => {
    if (!activePetId) return
    fetch(`/api/chat?petId=${activePetId}`)
      .then(r => r.json())
      .then((data: { role: string; content: string }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })))
        } else {
          setMessages([])
        }
      })
      .catch(() => setMessages([]))
  }, [activePetId])

  // 捲到最底部
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const activePet = pets.find(p => p.id === activePetId)
  const petName = activePet?.name ?? ''

  // 建議問題（依 mainProblems 動態調整第三題）
  const mainProblems = parseJson<string[]>(activePet?.mainProblems ?? '[]', [])
  const thirdSuggestion = mainProblems.length > 0
    ? `推薦適合${mainProblems[0]}的飲食調整方向`
    : '推薦適合腎臟病的飲食調整方向'

  const suggestions = [
    `${petName ? petName + ' ' : ''}最近眼睛有淚痕，該怎麼辦？`,
    '能幫我分析最近的症狀記錄嗎？',
    thirdSuggestion,
  ]

  const send = useCallback(async (content: string) => {
    if (!content.trim() || !activePetId) return
    const userMsg: Message = { role: 'user', content }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: activePetId, messages: nextMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI 回應失敗')
      const reply = data.message ?? data.reply ?? ''
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '抱歉，目前無法連線，請稍後再試。' }])
    } finally {
      setLoading(false)
    }
  }, [activePetId, messages])

  const handlePetChange = (petId: string) => {
    setActivePetId(petId)
    setMessages([])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* ── 頂部：標題 + 免責聲明 + 寵物切換（置頂）──────── */}
      <div className="shrink-0 px-6 md:px-8 pt-5 pb-3 border-b border-slate-100 bg-white">

        {/* 標題列（modal 內由 header 取代，可隱藏）*/}
        {showHeader && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E2F3E4] flex items-center justify-center text-[#2D6A4F] shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                <circle cx="20" cy="10" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">AI 諮詢</h1>
              <p className="text-xs text-slate-500 font-medium">與 AI 討論毛孩的健康問題</p>
            </div>
          </div>
        )}

        <div className="bg-[#FEF1E2] border border-[#F3D9BE] rounded-xl px-3 py-2 flex items-center gap-2 mb-3">
          <span className="text-[#D98A53] shrink-0"><IconInfo size={14} /></span>
          <p className="text-xs font-bold text-[#9A6233]">本功能提供資訊整理與觀察建議，不能替代獸醫診斷。</p>
        </div>

        {pets.length > 0 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {pets.map(pet => (
              <button
                key={pet.id}
                onClick={() => handlePetChange(pet.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors shrink-0 ${
                  activePetId === pet.id
                    ? 'bg-[#111111] text-white shadow-sm'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activePetId === pet.id ? 'bg-white/20' : 'bg-[#D98A53] text-white'
                }`}>
                  {pet.name.charAt(0)}
                </span>
                {pet.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 中間：對話訊息區（唯一可 scroll 區域）────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-4 flex flex-col gap-3 bg-white">

        {/* 空白狀態 */}
        {empty && (
          <div className="flex flex-col items-center text-center py-8">
            <PurePawLogo width={56} height={56} />
            <p className="font-bold text-slate-900 mt-4">
              {petName ? `和 AI 討論 ${petName} 的健康` : '和 AI 討論毛孩的健康'}
            </p>
            <p className="text-sm text-slate-500 font-medium mt-1">描述症狀、詢問飲食建議，或生成觀察計畫</p>
            <div className="mt-5 w-full max-w-md space-y-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full text-left px-4 py-3 bg-white rounded-2xl border-2 border-slate-900/5 text-sm font-bold text-slate-600 hover:border-[#D98A53]/50 hover:text-[#D98A53] transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 歷史訊息 */}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="mr-2 shrink-0 mt-0.5">
                <PurePawLogo width={28} height={28} />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed font-medium ${
              m.role === 'user'
                ? 'bg-[#111111] text-white rounded-3xl rounded-tr-md'
                : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-3xl rounded-tl-md'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {/* 打字中 */}
        {loading && (
          <div className="flex justify-start">
            <div className="mr-2 shrink-0"><PurePawLogo width={28} height={28} /></div>
            <div className="bg-white rounded-3xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-100">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── 底部：輸入列（置底）──────────────────────────── */}
      <div className={`shrink-0 bg-white border-t border-slate-100 px-6 md:px-8 pt-3 ${inputPaddingClassName}`}>
        {empty && (
          <button
            onClick={() => send(`請根據${petName}的狀況，幫我生成本週的健康觀察計畫，並給出改善建議。`)}
            className="w-full mb-2 flex items-center justify-center gap-2 bg-[#FEF1E2] text-[#D98A53] rounded-full py-2.5 text-sm font-bold hover:bg-[#FCE7D2] transition-colors"
          >
            <IconSparkles size={15} />
            生成本週觀察計畫
          </button>
        )}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={petName ? `詢問關於 ${petName} 的問題...` : '詢問關於毛孩的問題...'}
            className="flex-1 bg-transparent px-4 py-2 text-sm font-medium outline-none placeholder:text-slate-400"
          />
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-black transition-colors"
            aria-label="語音輸入" type="button">
            <IconMic size={18} />
          </button>
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center disabled:opacity-30 hover:bg-black transition-colors shrink-0"
            type="button" aria-label="送出訊息"
          >
            <IconSend size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
