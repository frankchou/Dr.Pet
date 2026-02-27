'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { symptomTypeLabel, severityEmoji, severityLabel, formatDate } from '@/lib/utils'
import type { SymptomEntry } from '@/types'

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

  useEffect(() => {
    // Get first pet
    fetch('/api/pets')
      .then((r) => r.json())
      .then((pets: Array<{ id: string }>) => {
        if (pets.length > 0) {
          setPetId(pets[0].id)
          return fetch(
            `/api/symptoms?petId=${pets[0].id}&symptomType=${type}&limit=30`
          )
        }
        return null
      })
      .then((r) => (r ? r.json() : []))
      .then((data: SymptomEntry[]) => {
        setEntries(data.reverse()) // oldest first for chart
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [type])

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
