import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import { parseJson } from '@/lib/utils'

function calcAge(birthday: Date | string | null | undefined): string {
  if (!birthday) return '年齡未知'
  const b = new Date(birthday)
  const now = new Date()
  const years = now.getFullYear() - b.getFullYear()
  const months = now.getMonth() - b.getMonth()
  const totalMonths = years * 12 + months
  if (totalMonths < 12) return `${totalMonths} 個月`
  return `${years} 歲`
}

export default async function PetListPage() {
  const pets = await prisma.pet.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <div>
      <PageHeader
        title="寵物檔案"
        rightElement={
          <Link
            href="/pet/new"
            className="text-sm text-[#4F7CFF] font-medium"
          >
            新增
          </Link>
        }
      />
      <div className="px-4 py-4 space-y-3">
        {pets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🐾</div>
            <p className="text-gray-500 mb-4">尚未建立寵物檔案</p>
            <Link
              href="/pet/new"
              className="inline-block px-6 py-3 bg-[#4F7CFF] text-white rounded-xl font-medium text-sm"
            >
              建立第一個寵物檔案
            </Link>
          </div>
        ) : (
          <>
            {pets.map((pet) => {
              const mainProblems = parseJson<string[]>(pet.mainProblems, [])
              const speciesEmoji =
                pet.species === '狗' ? '🐕' : pet.species === '貓' ? '🐈' : '🐾'
              return (
                <Link key={pet.id} href={`/pet/${pet.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent>
                      <div className="flex items-center gap-3">
                        {pet.avatar ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="text-4xl">{speciesEmoji}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="font-semibold text-[#1a1a2e]">{pet.name}</h2>
                            <span className="text-xs text-gray-400">
                              {pet.sex} {pet.isNeutered ? '(已結紮)' : ''}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {pet.species} {pet.breed ? `· ${pet.breed}` : ''} ·{' '}
                            {calcAge(pet.birthday)}
                          </p>
                          {mainProblems.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              關注：{mainProblems.slice(0, 3).join('、')}
                              {mainProblems.length > 3 && '...'}
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
            <Link
              href="/pet/new"
              className="block text-center py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm hover:border-[#4F7CFF] hover:text-[#4F7CFF] transition-colors"
            >
              + 新增寵物
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
