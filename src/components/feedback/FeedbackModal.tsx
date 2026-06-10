'use client'

import { useState } from 'react'
import { FEEDBACK_CATEGORIES, FEEDBACK_CONTENT_MAX } from '@/lib/feedback'

interface Props {
  onClose: () => void
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// 問題回報的選填分類；與後端白名單共用，空字串代表「不指定」。
const CATEGORIES = FEEDBACK_CATEGORIES

/**
 * 問題回報 modal：textarea（必填）+ 選填分類，送出 POST /api/feedback。
 * 置中卡片、遮罩點擊關閉、手機可捲動，沿用品牌色 #C4714A。
 */
export default function FeedbackModal({ onClose }: Props) {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(): Promise<void> {
    const trimmed = content.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, category: category || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error || '送出失敗，請稍後再試')
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '送出失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-3xl w-full max-w-[420px] max-h-[88dvh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <span className="font-bold text-lg text-[#2C1810] block leading-tight">問題回報</span>
            <span className="text-[11px] text-slate-400 font-medium">告訴我們遇到的問題或建議</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="關閉"
          >
            <XIcon />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FBF0E7] flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-bold text-[#2C1810] text-base mb-1">已收到你的回報</p>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-5">感謝你的回饋，我們會盡快處理。</p>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2.5 rounded-full bg-[#C4714A] text-white text-sm font-bold hover:bg-[#b3603b] transition-colors"
            >
              完成
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block">分類（選填）</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory((prev) => (prev === c ? '' : c))}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        category === c
                          ? 'bg-[#C4714A] border-[#C4714A] text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500">問題內容</label>
                  <span className="text-[11px] font-medium text-slate-300">{content.length} / {FEEDBACK_CONTENT_MAX}</span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  maxLength={FEEDBACK_CONTENT_MAX}
                  placeholder="請描述你遇到的問題或想法…"
                  className="w-full bg-[#FAF7F2] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#C4714A]/30 transition-all placeholder:text-slate-300 resize-none"
                />
              </div>

              {error && <p className="text-xs font-bold text-red-500">{error}</p>}
            </div>

            <div className="px-5 pb-5 pt-2 shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="w-full py-3 rounded-full bg-[#C4714A] text-white text-sm font-bold hover:bg-[#b3603b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? '送出中…' : '送出回報'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
