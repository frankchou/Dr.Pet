'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import type { Pet } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [currentPet, setCurrentPet] = useState<Pet | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [generatingTasks, setGeneratingTasks] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 載入歷史對話
  const loadHistory = useCallback(async (petId: string) => {
    setHistoryLoading(true)
    setMessages([])
    setError('')
    try {
      const res = await fetch(`/api/chat?petId=${petId}`)
      if (res.ok) {
        const data: { role: string; content: string }[] = await res.json()
        setMessages(data.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })))
      }
    } catch { /* silent */ }
    finally { setHistoryLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/pets')
      .then((r) => r.json())
      .then((data: Pet[]) => {
        setPets(data)
        if (data.length > 0) {
          setCurrentPet(data[0])
          loadHistory(data[0].id)
        }
      })
      .catch(console.error)
  }, [loadHistory])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!currentPet) { setError('請先建立寵物檔案'); return }
    const userMessage: Message = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: currentPet.id, messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '發送失敗')
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
    } catch (err) {
      setError(err instanceof Error ? err.message : '發送失敗，請稍後再試')
      setMessages((prev) => prev.slice(0, -1))
    } finally { setLoading(false) }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input.trim())
  }

  const handleGeneratePlan = async () => {
    if (!currentPet) return
    setGeneratingTasks(true)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: currentPet.id }),
      })
      await sendMessage('請根據我的寵物狀況，幫我生成本週的健康觀察計畫，並給出改善建議。')
    } catch { setError('生成計畫失敗') }
    finally { setGeneratingTasks(false) }
  }

  // 清除對話紀錄
  const handleClearHistory = async () => {
    if (!currentPet || !confirm(`確定要清除 ${currentPet.name} 的所有對話記錄？`)) return
    try {
      // 直接重新載入（不需要另外 API，只清本地）
      // 若要真正刪除 DB 記錄，可再加 DELETE /api/chat
      setMessages([])
    } catch { /* silent */ }
  }

  const speciesEmoji = currentPet?.species === '狗' ? '🐕' : currentPet?.species === '貓' ? '🐈' : '🐾'
  const showEmpty = !historyLoading && messages.length === 0

  return (
    <div className="flex flex-col h-screen -mb-20">
      <PageHeader
        title="AI 健康對話"
        rightElement={
          messages.length > 0 ? (
            <button onClick={handleClearHistory} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              清除記錄
            </button>
          ) : undefined
        }
      />

      {/* Disclaimer */}
      <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-2.5 shrink-0">
        <p className="text-xs text-amber-700">⚠️ 本功能提供資訊整理與觀察建議，不能替代獸醫診斷。</p>
      </div>

      {/* Pet selector */}
      {pets.length > 1 && (
        <div className="px-4 mt-3 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pets.map((pet) => (
              <button key={pet.id}
                onClick={() => { setCurrentPet(pet); loadHistory(pet.id) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                  currentPet?.id === pet.id ? 'bg-[#4F7CFF] text-white border-[#4F7CFF]' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                <span>{pet.species === '狗' ? '🐕' : pet.species === '貓' ? '🐈' : '🐾'}</span>
                <span>{pet.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* 載入中 */}
        {historyLoading && (
          <div className="text-center py-8">
            <div className="w-5 h-5 border-2 border-[#4F7CFF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-400">載入對話記錄中...</p>
          </div>
        )}

        {/* 空白狀態 */}
        {showEmpty && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">{speciesEmoji || '🐾'}</div>
            {currentPet ? (
              <>
                <p className="font-medium text-[#1a1a2e]">和 AI 討論 {currentPet.name} 的健康</p>
                <p className="text-sm text-gray-500 mt-1">描述症狀、詢問飲食建議，或生成觀察計畫</p>
                <div className="mt-4 space-y-2">
                  {[
                    `${currentPet.name} 最近眼睛有淚痕，該怎麼辦？`,
                    '能幫我分析最近的症狀記錄嗎？',
                    '推薦適合的飲食調整方向',
                  ].map((s) => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="block w-full text-left px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-[#4F7CFF] hover:text-[#4F7CFF] transition-colors"
                    >{s}</button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-500">請先建立寵物檔案</p>
            )}
          </div>
        )}

        {/* 歷史記錄提示 */}
        {!historyLoading && messages.length > 0 && (
          <div className="text-center">
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              對話記錄（共 {messages.length} 則）
            </span>
          </div>
        )}

        {/* 訊息列表 */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[#4F7CFF] flex items-center justify-center text-white text-xs mr-2 shrink-0 mt-0.5">🤖</div>
            )}
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
              msg.role === 'user' ? 'bg-[#4F7CFF] text-white rounded-tr-sm' : 'bg-white text-[#1a1a2e] shadow-sm rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* 打字中 */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-[#4F7CFF] flex items-center justify-center text-white text-xs mr-2 shrink-0">🤖</div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center">{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-100 mb-16">
        {currentPet && showEmpty && (
          <Button variant="secondary" size="sm" className="w-full mb-2" onClick={handleGeneratePlan} loading={generatingTasks}>
            ✨ 生成本週觀察計畫
          </Button>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={currentPet ? `詢問關於 ${currentPet.name} 的問題...` : '請先建立寵物檔案'}
            disabled={!currentPet || loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#4F7CFF] disabled:bg-gray-50"
          />
          <button type="submit" disabled={!input.trim() || loading || !currentPet}
            className="px-4 py-2.5 bg-[#4F7CFF] text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[#3d6ae8] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
