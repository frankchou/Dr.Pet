'use client'

import { useEffect, useState } from 'react'
import type { PublicReviewsResponse } from '@/app/api/reviews/route'

const StarRow = ({ rating }: { rating: number }) => {
  const full = Math.round(rating)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill={n <= full ? '#C4714A' : 'none'}
          stroke={n <= full ? '#C4714A' : '#D8C9BB'}
          strokeWidth={2}
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

/**
 * 公開評論列表（選項二）：顯示平均星等 + 公開評論。
 * 由呼叫端的旗標 SHOW_PUBLIC_REVIEWS 控制是否掛載；目前預設隱藏。
 */
export default function AppReviewsList() {
  const [data, setData] = useState<PublicReviewsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/reviews')
      .then((r) => {
        // 先判斷 res.ok：GET 失敗（如 500 回 { error }）時不可把錯誤物件當資料解析。
        if (!r.ok) throw new Error('failed to load reviews')
        return r.json() as Promise<PublicReviewsResponse>
      })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <p className="text-sm text-slate-400 font-medium px-1 py-4">載入評論中…</p>
  }
  if (!data || data.count === 0) {
    return <p className="text-sm text-slate-400 font-medium px-1 py-4">目前還沒有公開評論。</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-[#2C1810]">{data.averageRating.toFixed(1)}</span>
        <div>
          <StarRow rating={data.averageRating} />
          <span className="text-xs text-slate-400 font-medium">{data.count} 則評論</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.reviews.map((r) => (
          <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <StarRow rating={r.rating} />
            {r.comment && <p className="text-sm text-[#2C1810] font-medium leading-relaxed mt-2">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
