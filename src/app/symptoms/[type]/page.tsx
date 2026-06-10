'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { symptomTypeLabel, severityEmoji, severityLabel, formatDate } from '@/lib/utils'
import type { SymptomEntry } from '@/types'

interface SymptomAdvice {
  possibleCauses: string[]
  recommendedActions: string[]
}

const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false }
)
const Line = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false }
)
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
)
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
)
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
)
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
)

export default function SymptomTypePage() {
  const params = useParams()
  const type = params.type as string

  const [entries, setEntries] = useState<SymptomEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [petId, setPetId] = useState<string>('')

  // AI 建議狀態
  const [advice, setAdvice] = useState<SymptomAdvice | null>(null)
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [adviceError, setAdviceError] = useState<string | null>(null)

  // 對齊全站：以 localStorage 的 currentPetId 為準，而非「最舊寵物」
  useEffect(() => {
    const stored = localStorage.getItem('drpet_currentPetId')
    setPetId(stored || '')

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'drpet_currentPetId') setPetId(e.newValue || '')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!petId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/symptoms?petId=${petId}&symptomType=${type}&limit=30`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SymptomEntry[]) => {
        setEntries(Array.isArray(data) ? data.reverse() : []) // oldest first for chart
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [petId, type])

  // 抓 AI 建議（後端有快取，無新資料不會重打 AI）
  const fetchAdvice = useCallback(
    async (refresh = false) => {
      if (!petId) return
      setAdviceLoading(true)
      setAdviceError(null)
      try {
        const res = await fetch(
          `/api/symptoms/advice?petId=${petId}&symptomType=${type}${refresh ? '&refresh=1' : ''}`
        )
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || 'AI 建議生成失敗')
        }
        setAdvice(data.advice ?? null)
      } catch (err) {
        setAdviceError(err instanceof Error ? err.message : 'AI 建議生成失敗')
      } finally {
        setAdviceLoading(false)
      }
    },
    [petId, type]
  )

  // 有紀錄才自動抓建議（無紀錄則後端回 null，省一次 round-trip）
  useEffect(() => {
    if (!loading && entries.length > 0) {
      fetchAdvice()
    }
  }, [loading, entries.length, fetchAdvice])

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此記錄？')) return
    try {
      await fetch(`/api/symptoms/${id}`, { method: 'DELETE' })
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch {
      alert('刪除失敗')
    }
  }

  const chartData = entries.map((e) => ({
    date: new Date(e.createdAt).toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
    }),
    severity: e.severity,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">載入中...</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={symptomTypeLabel(type)}
        backHref="/symptoms"
      />

      <div className="px-4 py-4 space-y-4">
        {/* Chart */}
        {entries.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>嚴重度趨勢（近30筆）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 5]}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      ticks={[0, 1, 2, 3, 4, 5]}
                    />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      content={(props: any) => {
                        if (!props.active || !props.payload?.length) return null
                        const val = Number(props.payload[0].value)
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow">
                            <p>{props.label}</p>
                            <p className="font-medium">{severityEmoji(val)} {severityLabel(val)} ({val})</p>
                          </div>
                        )
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="severity"
                      stroke="#4F7CFF"
                      strokeWidth={2}
                      dot={{ fill: '#4F7CFF', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {entries.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: '記錄筆數',
                value: entries.length,
              },
              {
                label: '平均嚴重度',
                value: (
                  entries.reduce((a, b) => a + b.severity, 0) / entries.length
                ).toFixed(1),
              },
              {
                label: '最近一次',
                value: `${severityEmoji(entries[entries.length - 1].severity)} ${entries[entries.length - 1].severity}`,
              },
            ].map((stat) => (
              <Card key={stat.label} className="text-center">
                <CardContent className="py-1">
                  <p className="text-xl font-bold text-[#4F7CFF]">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* AI 建議：可能原因 / 建議做法（有紀錄才顯示） */}
        {entries.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI 觀察建議</CardTitle>
                {!adviceLoading && (
                  <button
                    onClick={() => fetchAdvice(true)}
                    className="text-xs text-[#4F7CFF] font-medium"
                  >
                    重新生成
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {adviceLoading ? (
                <p className="text-center text-gray-400 text-sm py-4">AI 分析中…</p>
              ) : adviceError ? (
                <div className="text-center py-4">
                  <p className="text-sm text-red-400 mb-2">{adviceError}</p>
                  <button
                    onClick={() => fetchAdvice(true)}
                    className="text-xs text-[#4F7CFF] font-medium"
                  >
                    重試
                  </button>
                </div>
              ) : advice &&
                (advice.possibleCauses.length > 0 ||
                  advice.recommendedActions.length > 0) ? (
                <div className="space-y-4">
                  {advice.possibleCauses.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[#1a1a2e] mb-2">
                        可能原因
                      </p>
                      <ul className="space-y-1.5">
                        {advice.possibleCauses.map((cause, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-600 flex gap-2"
                          >
                            <span className="text-[#4F7CFF]">•</span>
                            <span>{cause}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {advice.recommendedActions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[#1a1a2e] mb-2">
                        建議做法
                      </p>
                      <ul className="space-y-1.5">
                        {advice.recommendedActions.map((action, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-600 flex gap-2"
                          >
                            <span className="text-[#4F7CFF]">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-50 pt-3">
                    以上為資訊整理與觀察建議，非醫療診斷，不能替代獸醫診斷。若症狀嚴重或持續惡化，請立即帶往獸醫院就醫。
                  </p>
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm py-4">
                  暫無 AI 建議
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Entry list */}
        <Card>
          <CardHeader>
            <CardTitle>記錄列表</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">尚無記錄</p>
            ) : (
              <div className="space-y-3">
                {[...entries].reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-2xl">{severityEmoji(entry.severity)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[#1a1a2e]">
                          {severityLabel(entry.severity)} ({entry.severity}/5)
                        </span>
                        {entry.side && entry.side !== '不適用' && (
                          <span className="text-xs text-gray-400">{entry.side}側</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(entry.createdAt)}</p>
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="w-4 h-4"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {petId && (
          <a
            href={`/symptoms/new?type=${type}`}
            className="block text-center py-3 bg-[#4F7CFF] text-white rounded-2xl font-medium text-sm"
          >
            新增記錄
          </a>
        )}
      </div>
    </div>
  )
}
