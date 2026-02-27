import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { severityEmoji, severityLabel, symptomTypeLabel, productTypeLabel, parseJson, formatDate } from '@/lib/utils'
import TaskList from '@/components/tasks/TaskList'

async function getFirstPet() {
  return await prisma.pet.findFirst({ orderBy: { createdAt: 'asc' } })
}

async function getWeeklySymptoms(petId: string) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return await prisma.symptomEntry.findMany({
    where: { petId, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

async function getWeeklyTasks(petId: string) {
  return await prisma.weeklyTask.findMany({
    where: { petId },
    orderBy: { createdAt: 'desc' },
    take: 7,
  })
}

async function getRecentUsages(petId: string) {
  return await prisma.productUsage.findMany({
    where: { petId },
    orderBy: { date: 'desc' },
    take: 5,
    include: { product: true },
  })
}

export default async function HomePage() {
  const pet = await getFirstPet()

  if (!pet) {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-6">
        <div className="text-6xl mt-8">🐾</div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">寵物隨行醫師</h1>
          <p className="text-gray-500 text-sm">您的寵物健康管理助理</p>
        </div>
        <Card className="w-full text-center">
          <CardContent>
            <p className="text-gray-600 mb-4">尚未建立寵物檔案</p>
            <Link
              href="/pet/new"
              className="inline-block px-6 py-3 bg-[#4F7CFF] text-white rounded-xl font-medium text-sm"
            >
              建立寵物檔案
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [weeklySymptoms, weeklyTasks, recentUsages] = await Promise.all([
    getWeeklySymptoms(pet.id),
    getWeeklyTasks(pet.id),
    getRecentUsages(pet.id),
  ])

  const mainProblems = parseJson<string[]>(pet.mainProblems, [])
  const speciesEmoji = pet.species === '狗' ? '🐕' : pet.species === '貓' ? '🐈' : '🐾'

  // Group symptoms by type for trend summary
  const symptomsByType = weeklySymptoms.reduce(
    (acc, s) => {
      if (!acc[s.symptomType]) acc[s.symptomType] = []
      acc[s.symptomType].push(s.severity)
      return acc
    },
    {} as Record<string, number[]>
  )

  const completedTasks = weeklyTasks.filter((t) => t.completed).length

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a2e]">寵物隨行醫師</h1>
          <p className="text-xs text-gray-500">{formatDate(new Date())}</p>
        </div>
        <Link href="/pet">
          {pet.avatar ? (
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <span className="text-2xl">{speciesEmoji}</span>
          )}
        </Link>
      </div>

      {/* Pet info card */}
      <Card className="bg-gradient-to-br from-[#4F7CFF] to-[#7B9FFF] text-white">
        <CardContent>
          <div className="flex items-center gap-3">
            {pet.avatar ? (
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/50 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="text-4xl">{speciesEmoji}</div>
            )}
            <div>
              <h2 className="text-lg font-bold">{pet.name}</h2>
              <p className="text-blue-100 text-sm">
                {pet.species} {pet.breed ? `· ${pet.breed}` : ''} {pet.weight ? `· ${pet.weight}kg` : ''}
              </p>
              {mainProblems.length > 0 && (
                <p className="text-blue-100 text-xs mt-1">
                  關注：{mainProblems.map((p: string) => symptomTypeLabel(p)).join('、')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick log CTA */}
      <Link href="/symptoms/new">
        <Card className="border-2 border-dashed border-[#4F7CFF]/30 bg-[#4F7CFF]/5">
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <p className="font-medium text-[#4F7CFF] text-sm">今日症狀記錄</p>
                <p className="text-xs text-gray-500">點擊記錄今天的觀察</p>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4 text-[#4F7CFF] ml-auto"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Weekly trend */}
      <Card>
        <CardHeader>
          <CardTitle>本週症狀趨勢</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(symptomsByType).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-2">本週尚無症狀記錄</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(symptomsByType).map(([type, severities]) => {
                const avg = severities.reduce((a, b) => a + b, 0) / severities.length
                const max = Math.max(...severities)
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-sm w-20 text-gray-600 truncate">
                      {symptomTypeLabel(type)}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-[#4F7CFF] h-2 rounded-full"
                        style={{ width: `${(avg / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">
                      {severityEmoji(max)} {severityLabel(Math.round(avg))}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>本週任務</CardTitle>
            <span className="text-xs text-gray-400">
              {completedTasks}/{weeklyTasks.length} 完成
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {weeklyTasks.length === 0 ? (
            <div className="text-center py-2">
              <p className="text-gray-400 text-sm mb-3">尚無任務</p>
              <Link
                href="/chat"
                className="text-xs text-[#4F7CFF] font-medium"
              >
                前往對話生成任務
              </Link>
            </div>
          ) : (
            <TaskList
              initialTasks={weeklyTasks.map((t) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                completed: t.completed,
              }))}
            />
          )}
        </CardContent>
      </Card>

      {/* Recent products */}
      {recentUsages.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>近期使用產品</CardTitle>
              <Link href="/log" className="text-xs text-[#4F7CFF]">
                查看全部
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentUsages.map((usage) => (
                <div key={usage.id} className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 w-12 shrink-0">
                    {productTypeLabel(usage.product.type)}
                  </span>
                  <span className="text-sm text-[#1a1a2e] truncate">
                    {usage.product.name}
                  </span>
                  {usage.product.brand && (
                    <span className="text-xs text-gray-400 truncate">
                      {usage.product.brand}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
