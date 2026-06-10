'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import { symptomTypeLabel, severityEmoji, severityLabel } from '@/lib/utils'

const SYMPTOM_TYPES = ['tear', 'skin', 'digestive', 'oral', 'ear', 'joint', 'other']

interface SymptomEntry {
  id: string
  symptomType: string
  severity: number
  notes: string | null
  createdAt: string
}

interface TypeSummary {
  type: string
  latest: SymptomEntry | null
  previous: SymptomEntry | null
}

// 由整批症狀紀錄計算每個類型的最新一筆與前一筆（供趨勢比較）
function summarizeByType(entries: SymptomEntry[]): TypeSummary[] {
  return SYMPTOM_TYPES.map((type) => {
    // entries 已依 createdAt desc 排序，第 0 筆為最新、第 1 筆為前一次
    const ofType = entries.filter((e) => e.symptomType === type)
    return {
      type,
      latest: ofType[0] ?? null,
      previous: ofType[1] ?? null,
    }
  })
}

export default function SymptomsPage() {
  // 對齊其他頁：以 localStorage 的 currentPetId 為準，而非「最舊寵物」
  const [petId, setPetId] = useState<string | null>(null)
  const [entries, setEntries] = useState<SymptomEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // localStorage 僅存在於 client，惰性初始化會造成 SSR/hydration 不一致，故於 effect 水合
    const stored = localStorage.getItem('drpet_currentPetId')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPetId(stored)

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'drpet_currentPetId') setPetId(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!petId) {
      // 無選定寵物時清空列表並結束載入，屬與外部資料（petId）同步
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntries([])
      setLoading(false)
      return
    }
    // 切換寵物時觸發非同步抓取，setLoading 為與外部 fetch 同步的載入旗標
    setLoading(true)
    fetch(`/api/symptoms?petId=${petId}&limit=200`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SymptomEntry[]) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [petId])

  if (!loading && !petId) {
    return (
      <div>
        <PageHeader title="症狀記錄" />
        <div className="px-4 py-12 text-center">
          <p className="text-gray-500 mb-4">請先選擇或建立寵物檔案</p>
          <Link
            href="/pet/new"
            className="inline-block px-6 py-3 bg-[#4F7CFF] text-white rounded-xl font-medium text-sm"
          >
            建立寵物檔案
          </Link>
        </div>
      </div>
    )
  }

  const summaries = summarizeByType(entries)
  const activeTypes = summaries.filter((e) => e.latest)
  const inactiveTypes = summaries.filter((e) => !e.latest)

  return (
    <div>
      <PageHeader
        title="症狀記錄"
        rightElement={
          <Link href="/symptoms/new" className="text-sm text-[#4F7CFF] font-medium">
            新增
          </Link>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">載入中…</div>
        ) : (
          <>
            {activeTypes.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500 text-sm mb-4">尚無症狀記錄</p>
              </div>
            )}

            {activeTypes.map(({ type, latest, previous }) => {
              if (!latest) return null
              const trend =
                previous !== null
                  ? latest.severity > previous.severity
                    ? 'worse'
                    : latest.severity < previous.severity
                      ? 'better'
                      : 'same'
                  : 'new'

              return (
                <Link key={type} href={`/symptoms/${type}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{severityEmoji(latest.severity)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-[#1a1a2e]">
                              {symptomTypeLabel(type)}
                            </h3>
                            {trend === 'worse' && <span className="text-xs text-red-500">▲ 加重</span>}
                            {trend === 'better' && <span className="text-xs text-green-500">▼ 改善</span>}
                            {trend === 'same' && <span className="text-xs text-gray-400">— 持平</span>}
                          </div>
                          <p className="text-sm text-gray-500">
                            {severityLabel(latest.severity)} ·{' '}
                            {new Date(latest.createdAt).toLocaleDateString('zh-TW')}
                          </p>
                          {latest.notes && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{latest.notes}</p>
                          )}
                        </div>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="w-4 h-4 text-gray-400 shrink-0"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}

            {/* Inactive symptom types */}
            {inactiveTypes.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2 px-1">尚未記錄的症狀類型</p>
                <div className="flex flex-wrap gap-2">
                  {inactiveTypes.map(({ type }) => (
                    <Link
                      key={type}
                      href={`/symptoms/new?type=${type}`}
                      className="px-3 py-1.5 bg-white rounded-full text-sm text-gray-500 border border-gray-200 hover:border-[#4F7CFF] hover:text-[#4F7CFF] transition-colors"
                    >
                      + {symptomTypeLabel(type)}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/symptoms/new"
              className="block text-center py-3 bg-[#4F7CFF] text-white rounded-2xl font-medium text-sm"
            >
              記錄新症狀
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
