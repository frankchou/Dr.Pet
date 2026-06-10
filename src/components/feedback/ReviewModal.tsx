'use client'

import { useEffect, useState } from 'react'
import { REVIEW_COMMENT_MAX } from '@/lib/feedback'
import type { ReviewEligibilityResponse } from '@/app/api/reviews/eligibility/route'

interface Props {
  onClose: () => void
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width={36}
    height={36}
    fill={filled ? '#C4714A' : 'none'}
    stroke={filled ? '#C4714A' : '#D8C9BB'}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const RATING_LABELS = ['', '很不滿意', '不滿意', '普通', '滿意', '非常滿意'] as const

/**
 * 評論／評分 modal：可點選的 1-5 星 + 選填留言，送出 POST /api/reviews。
 * 置中卡片、遮罩點擊關閉、手機可捲動，沿用品牌色 #C4714A。
 */
// 預檢狀態：loading=查詢中；blocked=本月已評論過（含下次可評論時間）；
// open=可正常填寫（含預檢失敗時退回的情況，送出時仍有後端 429 backstop 把關）。
type Precheck =
  | { status: 'loading' }
  | { status: 'open' }
  | { status: 'blocked'; nextAvailable: string }

function formatNextAvailable(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ReviewModal({ onClose }: Props) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [precheck, setPrecheck] = useState<Precheck>({ status: 'loading' })

  // modal 開啟即查資格：已評論過者直接擋下並告知下次時間，避免白填。
  // 預檢失敗（網路 / 5xx）退回 'open'，交由送出時的後端 429 把關。
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await fetch('/api/reviews/eligibility')
        if (!res.ok) throw new Error('precheck failed')
        const data = await res.json() as ReviewEligibilityResponse
        if (!active) return
        if (!data.canReview && data.nextAvailable) {
          setPrecheck({ status: 'blocked', nextAvailable: data.nextAvailable })
        } else {
          setPrecheck({ status: 'open' })
        }
      } catch {
        if (active) setPrecheck({ status: 'open' })
      }
    })()
    return () => { active = false }
  }, [])

  const blocked = precheck.status === 'blocked'
  const checking = precheck.status === 'loading'

  async function handleSubmit(): Promise<void> {
    if (blocked) return
    if (rating < 1 || rating > 5 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
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
            <span className="font-bold text-lg text-[#2C1810] block leading-tight">評論 / 評分</span>
            <span className="text-[11px] text-slate-400 font-medium">你的評價是我們前進的動力</span>
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
              <StarIcon filled />
            </div>
            <p className="font-bold text-[#2C1810] text-base mb-1">感謝你的評價</p>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-5">我們會持續努力做得更好。</p>
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
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
              {checking ? (
                <div className="py-10 text-center text-sm font-medium text-slate-400">
                  確認評論資格中…
                </div>
              ) : (
                <>
                  {blocked && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-bold text-amber-800">你這個月已評論過</p>
                      <p className="text-xs font-medium text-amber-700 mt-1 leading-relaxed">
                        下次可評論時間：{formatNextAvailable(precheck.nextAvailable)}
                      </p>
                    </div>
                  )}

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          disabled={blocked}
                          aria-label={`${n} 星`}
                          className="transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <StarIcon filled={n <= rating} />
                        </button>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-[#C4714A] mt-3 h-5">
                      {rating > 0 ? RATING_LABELS[rating] : '點擊星星評分'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-500">留言（選填）</label>
                      <span className="text-[11px] font-medium text-slate-300">{comment.length} / {REVIEW_COMMENT_MAX}</span>
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      maxLength={REVIEW_COMMENT_MAX}
                      disabled={blocked}
                      placeholder="想對我們說的話…"
                      className="w-full bg-[#FAF7F2] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#C4714A]/30 transition-all placeholder:text-slate-300 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                </>
              )}
            </div>

            <div className="px-5 pb-5 pt-2 shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={blocked || checking || rating < 1 || submitting}
                className="w-full py-3 rounded-full bg-[#C4714A] text-white text-sm font-bold hover:bg-[#b3603b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? '送出中…' : '送出評價'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
