'use client'

import { useState, useEffect } from 'react'

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [needsSetup, setNeedsSetup] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('drpet_userId')
    if (!stored) setNeedsSetup(true)
  }, [])

  const handleSubmit = async () => {
    const clean = nickname.trim()
    if (!clean) { setError('請輸入暱稱'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: clean }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.id) {
        setError(data?.error || '儲存失敗，請重新整理頁面後再試')
        return
      }
      localStorage.setItem('drpet_userId', data.id)
      localStorage.setItem('drpet_nickname', data.nickname)
      setNeedsSetup(false)
    } catch {
      setError('連線失敗，請確認網路後再試')
    } finally {
      setSaving(false)
    }
  }

  if (needsSetup) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
        <div className="w-full max-w-[400px] bg-white rounded-3xl px-6 pt-8 pb-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🐾</div>
            <h1 className="text-xl font-bold text-gray-900">歡迎使用寵物隨行醫師</h1>
            <p className="text-sm text-gray-500 mt-1.5">
              請設定您的飼主暱稱，讓社群功能可以為您推薦最適合的產品
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">飼主暱稱</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="例：小花媽咪、毛孩老爸"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4714A]/40 focus:border-[#C4714A]"
              autoFocus
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              相同暱稱可跨裝置同步資料，請選擇您記得住的名稱
            </p>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-[#C4714A] text-white rounded-xl py-3.5 font-medium text-sm disabled:opacity-60 active:opacity-90 transition-opacity"
          >
            {saving ? '設定中…' : '開始使用'}
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
