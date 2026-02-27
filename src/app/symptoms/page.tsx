import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import { symptomTypeLabel, severityEmoji, severityLabel } from '@/lib/utils'

const SYMPTOM_TYPES = ['tear', 'skin', 'digestive', 'oral', 'ear', 'joint', 'other']

export default async function SymptomsPage() {
  const pet = await prisma.pet.findFirst({ orderBy: { createdAt: 'asc' } })

  if (!pet) {
    return (
      <div>
        <PageHeader title="症狀記錄" />
        <div className="px-4 py-12 text-center">
          <p className="text-gray-500 mb-4">請先建立寵物檔案</p>
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

  // Get latest entry for each symptom type
  const latestEntries = await Promise.all(
    SYMPTOM_TYPES.map(async (type) => {
      const latest = await prisma.symptomEntry.findFirst({
        where: { petId: pet.id, symptomType: type },
        orderBy: { createdAt: 'desc' },
      })
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const previous = await prisma.symptomEntry.findFirst({
        where: {
          petId: pet.id,
          symptomType: type,
          createdAt: { lt: latest?.createdAt || new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
      return { type, latest, previous }
    })
  )

  const activeTypes = latestEntries.filter((e) => e.latest)
  const inactiveTypes = latestEntries.filter((e) => !e.latest)

  return (
    <div>
      <PageHeader
        title="症狀記錄"
        rightElement={
          <Link
            href="/symptoms/new"
            className="text-sm text-[#4F7CFF] font-medium"
          >
            新增
          </Link>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {activeTypes.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm mb-4">尚無症狀記錄</p>
          </div>
        )}

        {activeTypes.map(({ type, latest, previous }) => {
          if (!latest) return null
          const trend =
            previous !== null && previous !== undefined
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
                        {trend === 'worse' && (
                          <span className="text-xs text-red-500">▲ 加重</span>
                        )}
                        {trend === 'better' && (
                          <span className="text-xs text-green-500">▼ 改善</span>
                        )}
                        {trend === 'same' && (
                          <span className="text-xs text-gray-400">— 持平</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {severityLabel(latest.severity)} ·{' '}
                        {new Date(latest.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                      {latest.notes && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {latest.notes}
                        </p>
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
      </div>
    </div>
  )
}
