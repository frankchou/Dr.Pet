'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePollingRefresh } from '@/hooks/usePollingRefresh'
import { parseJson, symptomTypeLabel } from '@/lib/utils'
import IngredientAnalysis from '@/components/home/IngredientAnalysis'

// ─── 型別 ────────────────────────────────────────────────────────────────────

interface Pet {
  id: string
  name: string
  species: string
  breed?: string | null
  sex: string
  birthday?: string | null
  weight?: number | null
  isNeutered: boolean
  avatar?: string | null
  mainProblems?: string | null
  allergies?: string | null
}

// ─── 小工具 ──────────────────────────────────────────────────────────────────

/** 計算年齡字串，如 "3歲2個月" 或 "5歲" */
function calcAge(birthday: string | null | undefined): string | null {
  if (!birthday) return null
  const birth = new Date(birthday)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0) { years -= 1; months += 12 }
  if (years <= 0 && months <= 0) return '未滿1個月'
  if (months === 0) return `${years}歲`
  if (years === 0) return `${months}個月`
  return `${years}歲${months}個月`
}

/** 性別標籤 */
function genderLabel(sex: string, isNeutered: boolean): string {
  const isMale = sex === 'male' || sex === 'M' || sex === '公'
  if (isNeutered) return isMale ? '♂ 已結紮' : '♀ 已結紮'
  return isMale ? '♂' : '♀'
}

// ─── Inline SVG 圖示（strokeWidth 2.5，lucide 風格）──────────────────────────

function SvgActivity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function SvgSparkles({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M12 3l1.09 3.31L16.5 7.5l-3.41 1.09L12 12l-1.09-3.41L7.5 7.5l3.41-1.09z" />
      <path d="M5 3l.54 1.66L7.2 5.5l-1.66.54L5 7.7l-.54-1.66L2.8 5.5l1.66-.54z" />
      <path d="M19 12l.54 1.66 1.66.54-1.66.54L19 16.4l-.54-1.66-1.66-.54 1.66-.54z" />
    </svg>
  )
}

function SvgPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" width={22} height={22}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SvgArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  )
}

function SvgCalendar({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function SvgDroplets({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
      <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
    </svg>
  )
}

function SvgCake({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
      <path d="M2 21h20" />
      <path d="M7 8v2" /><path d="M12 8v2" /><path d="M17 8v2" />
      <path d="M7 4h.01" /><path d="M12 4h.01" /><path d="M17 4h.01" />
    </svg>
  )
}

function SvgHeartPulse() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  )
}

function SvgHeart({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function SvgZap({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

// ─── 子元件 ──────────────────────────────────────────────────────────────────

function IconChip({ icon, bgColor }: { icon: React.ReactNode; bgColor: string }) {
  return (
    <div
      className="w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 shadow-sm border border-slate-900/5 text-[#111111]"
      style={{ backgroundColor: bgColor }}
    >
      {icon}
    </div>
  )
}

function HealthTag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  if (accent) {
    return (
      <span className="bg-[#D98A53] text-white px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm">
        <SvgSparkles size={10} />
        {children}
      </span>
    )
  }
  return (
    <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-600">
      {children}
    </span>
  )
}

function HealthMetric({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value?: string | null }) {
  return (
    <div className="bg-white border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center gap-2 text-center shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#111111]" style={{ backgroundColor: bg }}>
        {icon}
      </div>
      <p className={`text-sm font-bold ${value ? 'text-slate-900' : 'text-slate-400'}`}>{value ?? '未記錄'}</p>
      <p className="text-[10px] font-bold text-slate-400 leading-tight">{label}</p>
    </div>
  )
}

// ─── 頁面元件 ────────────────────────────────────────────────────────────────

interface HealthMetricRecord {
  bodyScore?: number | null
  vitality?: string | null
  waterIntake?: string | null
}

export default function HomePage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [currentPetId, setCurrentPetId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [scheduleTab, setScheduleTab] = useState<'medical' | 'grooming' | 'holiday'>('medical')
  const [healthMetric, setHealthMetric] = useState<HealthMetricRecord | null>(null)
  const [todayMealCount, setTodayMealCount] = useState<number>(0)

  // 載入寵物列表（共同飼主可能在另一端新增/編輯毛孩，故可被輪詢重抓）
  const fetchPets = useCallback(() => {
    fetch('/api/pets')
      .then(r => r.json())
      .then((data: Pet[]) => {
        setPets(Array.isArray(data) ? data : [])
        setCurrentPetId(prev => {
          if (prev && data.some(p => p.id === prev)) return prev
          const stored = localStorage.getItem('drpet_currentPetId')
          const match = stored && data.find(p => p.id === stored)
          return match ? stored : data[0]?.id ?? ''
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchPets()
  }, [fetchPets])

  // 載入健康指標 + 今日餐數
  const fetchPetDaily = useCallback((petId: string) => {
    if (!petId) return
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/health-metrics?petId=${petId}&date=${today}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: HealthMetricRecord | null) => setHealthMetric(d))
      .catch(() => {})
    fetch(`/api/usages?petId=${petId}&date=${today}`)
      .then(r => r.ok ? r.json() : [])
      .then((d: unknown[]) => setTodayMealCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchPetDaily(currentPetId)
  }, [currentPetId, fetchPetDaily])

  // 共享資料即時同步：定時 / 重新聚焦時重抓寵物列表與當前毛孩的當日資料
  const refreshShared = useCallback(() => {
    fetchPets()
    fetchPetDaily(currentPetId)
  }, [fetchPets, fetchPetDaily, currentPetId])
  usePollingRefresh(refreshShared)

  // 監聽 localStorage drpet_currentPetId 的變化（header 切換寵物時）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'drpet_currentPetId' && e.newValue) {
        setCurrentPetId(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (currentPetId) {
      localStorage.setItem('drpet_currentPetId', currentPetId)
    }
  }, [currentPetId])

  const currentPet = pets.find(p => p.id === currentPetId) ?? null

  const allergies = parseJson<string[]>(currentPet?.allergies ?? '[]', [])
  const mainProblems = parseJson<string[]>(currentPet?.mainProblems ?? '[]', [])

  // 生日 MM-DD 格式
  const birthdayMMDD = currentPet?.birthday
    ? currentPet.birthday.slice(5, 10)
    : null

  const ageLabel = currentPet?.birthday ? calcAge(currentPet.birthday) : null

  // 計算下次生日距今幾天（複用 birthdayMMDD 避免 ISO 格式解析問題）
  const daysUntilBirthday = (() => {
    if (!birthdayMMDD) return null
    const [mm, dd] = birthdayMMDD.split('-').map(Number)
    if (isNaN(mm) || isNaN(dd)) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let next = new Date(today.getFullYear(), mm - 1, dd)
    if (next.getTime() <= today.getTime()) next = new Date(today.getFullYear() + 1, mm - 1, dd)
    return Math.ceil((next.getTime() - today.getTime()) / 86400000)
  })()
  const genderBadge = currentPet ? genderLabel(currentPet.sex, currentPet.isNeutered) : null

  return (
    <div
      className="px-6 md:px-8 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2 md:pt-4 max-w-2xl mx-auto w-full"
      style={{ fontFamily: 'var(--pp-font)' }}
    >

      {/* 無寵物引導（取代整個 hero + 主體） */}
      {!loading && !currentPet && (
        <div className="flex flex-col items-center justify-center gap-6 py-24 flex-1">
          <div className="w-20 h-20 rounded-3xl bg-[#FFE8D6] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#D98A53" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={36} height={36}>
              <path d="M10.5 2.5C10.5 2.5 9 4 6.5 4S3 2.5 3 2.5A9.5 9.5 0 0 0 3 9c0 5.25 9 11 9 11s9-5.75 9-11a9.5 9.5 0 0 0 0-6.5S19 4 16.5 4 13.5 2.5 13.5 2.5" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#111111] mb-1">還沒有毛孩檔案</p>
            <p className="text-sm text-slate-400 font-medium">建立第一個毛孩檔案，開始記錄健康！</p>
          </div>
          <Link
            href="/settings"
            className="bg-[#111111] text-white font-bold rounded-2xl px-8 py-4 hover:bg-black transition-colors shadow-lg shadow-black/10 text-sm"
          >
            建立毛孩檔案
          </Link>
        </div>
      )}

      {/* 1. Pet Profile Hero（有寵物才渲染） */}
      {(loading || currentPet) && (
      <div className="relative shrink-0 -mx-6 md:-mx-8 -mt-28 md:-mt-4 mb-8 h-[560px] md:h-[700px] overflow-hidden flex flex-col justify-end md:rounded-t-[24px]">
        {loading ? (
          <div className="absolute inset-0 bg-[#FFE8D6]/50 animate-pulse" />
        ) : currentPet ? (
          <div className="absolute inset-0 z-0">
            {currentPet.avatar ? (
              <Image
                src={currentPet.avatar}
                alt={currentPet.name}
                fill
                className="object-cover object-top scale-125 origin-top"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-[#FFE8D6] flex items-end justify-center pb-28">
                {/* 無頭像顯示名字首字 */}
                <span className="text-[120px] font-bold text-[#D98A53]/30 select-none leading-none">
                  {currentPet.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#F4F7FB] via-[#F4F7FB]/80 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#FFE8D6]" />
        )}

        {/* Hero 文字區 */}
        <div className="relative z-10 flex flex-col items-center pb-6 md:pb-10 px-4">
          {loading ? (
            <div className="w-fit flex flex-col items-start gap-3">
              <div className="h-8 w-32 bg-[#D98A53]/20 rounded-xl animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-9 w-20 bg-[#D98A53]/20 rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          ) : currentPet ? (
            <div className="w-fit flex flex-col items-start">
              <h1 className="text-2xl md:text-3xl font-bold mb-3 text-[#3A332C] tracking-widest drop-shadow-sm">
                {currentPet.name}
              </h1>
              <div className="flex flex-wrap gap-3">
                {[
                  currentPet.breed || currentPet.species,
                  genderBadge,
                  ageLabel,
                ]
                  .filter(Boolean)
                  .map((tag, i) => (
                    <span
                      key={i}
                      className="bg-[#FAF8F5]/80 backdrop-blur-md px-5 py-2 rounded-full text-sm font-bold text-[#3A332C] shadow-sm border border-white/40"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      )}

      {/* 主體內容 */}
      {(loading || currentPet) && (
        <div className="flex flex-col gap-8 pb-8">

          {/* 1. 重要日程 */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-700">
                <SvgSparkles size={16} />
              </div>
              <h3 className="font-bold text-slate-800">重要日程</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#D98A53]/50 transition-colors cursor-pointer bg-white">
                <SvgCalendar size={24} />
                <span className="text-[10px] md:text-xs font-bold text-slate-600 mb-1 mt-2">年度疫苗</span>
                <span className="text-sm font-bold text-slate-400">--</span>
              </div>
              <div className="border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#5C946E]/50 transition-colors cursor-pointer bg-white">
                <SvgDroplets size={24} />
                <span className="text-[10px] md:text-xs font-bold text-slate-600 mb-1 mt-2">體外驅蟲</span>
                <span className="text-sm font-bold text-slate-400">--</span>
              </div>
              <div className="border-2 border-slate-900/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#F391B3]/50 transition-colors cursor-pointer bg-white">
                <SvgCake size={24} />
                <span className="text-[10px] md:text-xs font-bold text-slate-600 mb-1 mt-2">生日</span>
                <span className="text-sm font-bold text-slate-700">
                  {birthdayMMDD ?? '--'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. 健康檔案概覽 */}
          <div className="flex flex-col">
            <div className="flex items-end justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
                  <SvgActivity />
                </div>
                <h2 className="text-xl font-bold tracking-tight">健康檔案概覽</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-10">
              {/* 飲食需知 */}
              <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <IconChip bgColor="#FEF1E2" icon={
                  <svg viewBox="0 0 24 24" fill="currentColor" width={24} height={24}>
                    <ellipse cx="5" cy="12" rx="3.8" ry="2.6"/>
                    <ellipse cx="12" cy="12" rx="3.8" ry="2.6"/>
                    <ellipse cx="19" cy="12" rx="3.8" ry="2.6"/>
                  </svg>
                } />
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">飲食需知</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {loading ? (
                      <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
                    ) : allergies.length === 0 ? (
                      <span className="text-slate-400 text-sm">尚未記錄</span>
                    ) : (
                      allergies.map((a, i) => (
                        <HealthTag key={i} accent={i === 0}>{a}</HealthTag>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 確診疾病 */}
              <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <IconChip bgColor="#FDE2EC" icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
                    <rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><line x1="12" y1="11" x2="12" y2="15"/><line x1="10" y1="13" x2="14" y2="13"/>
                  </svg>
                } />
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">確診疾病</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {loading ? (
                      <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
                    ) : mainProblems.length === 0 ? (
                      <span className="text-slate-400 text-sm">尚未記錄</span>
                    ) : (
                      mainProblems.slice(0, 3).map((p, i) => (
                        <HealthTag key={i}>{symptomTypeLabel(p)}</HealthTag>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 日常症狀 */}
              <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <IconChip bgColor="#EAF5ED" icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
                    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                    <path d="m8.5 8.5 7 7"/>
                  </svg>
                } />
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">日常症狀</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {loading ? (
                      <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
                    ) : mainProblems.length === 0 ? (
                      <span className="text-slate-400 text-sm">尚未記錄</span>
                    ) : (
                      mainProblems.map((p, i) => (
                        <HealthTag key={i}>{symptomTypeLabel(p)}</HealthTag>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 活力指數 */}
              <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <IconChip bgColor="#FEF1E2" icon={
                  <SvgZap size={24} />
                } />
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">活力指數</h3>
                  {loading ? (
                    <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                  ) : healthMetric?.vitality ? (
                    <HealthTag accent>
                      {healthMetric.vitality === 'high' ? '活躍' : healthMetric.vitality === 'medium' ? '正常' : '低落'}
                    </HealthTag>
                  ) : (
                    <span className="text-slate-400 text-sm">尚未記錄</span>
                  )}
                </div>
              </div>

              {/* 水分攝取 */}
              <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <IconChip bgColor="#EDF3FB" icon={
                  <SvgDroplets size={24} />
                } />
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 leading-tight">水分攝取</h3>
                  {loading ? (
                    <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                  ) : healthMetric?.waterIntake ? (
                    <HealthTag accent>
                      {healthMetric.waterIntake === 'high' ? '偏多' : healthMetric.waterIntake === 'medium' ? '正常' : '偏少'}
                    </HealthTag>
                  ) : (
                    <span className="text-slate-400 text-sm">尚未記錄</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* 3 + 4. 日程區塊 */}
          <div className="w-full flex flex-col">

            {/* 3. 未來日程表 */}
            <div className="flex items-end justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
                  <SvgCalendar size={16} />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">未來日程表</h2>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
              {(
                [
                  { key: 'medical', label: '醫療' },
                  { key: 'grooming', label: '美容' },
                  { key: 'holiday', label: '節日' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setScheduleTab(key)}
                  className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${
                    scheduleTab === key
                      ? 'bg-[#111111] text-white shadow-sm'
                      : 'text-slate-500 hover:text-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 節日 tab：顯示生日 */}
            {scheduleTab === 'holiday' && (
              <>
                {birthdayMMDD ? (
                  <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FEF1E2] flex items-center justify-center text-2xl shrink-0">🎂</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">{currentPet?.name} 的生日</p>
                      <p className="text-sm font-bold text-slate-400">{birthdayMMDD.replace('-', '/')} · {daysUntilBirthday === 0 ? '🎉 今天就是生日！' : `還有 ${daysUntilBirthday} 天`}</p>
                    </div>
                    <span className="text-xs font-bold text-[#D98A53] bg-[#FEF1E2] px-3 py-1.5 rounded-full shrink-0">節日</span>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-8 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                    <SvgCalendar size={32} />
                    <p className="text-slate-400 font-bold text-sm">尚無節日記錄</p>
                  </div>
                )}
              </>
            )}

            {/* 醫療 / 美容 tab：暫無資料 */}
            {(scheduleTab === 'medical' || scheduleTab === 'grooming') && (
              <div className="bg-white border-2 border-slate-900/5 rounded-[28px] p-8 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                <SvgCalendar size={32} />
                <p className="text-slate-400 font-bold text-sm">尚無日程記錄</p>
              </div>
            )}

            {/* 健康指標 — 活力/水分已移至健康檔案概覽，此區塊暫時隱藏
            <div className="flex items-center gap-2 mt-10 mb-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100">
                <SvgHeartPulse />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">健康指標</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <HealthMetric icon={<SvgHeart size={18} />} bg="#FDE2EC" label="體態評分"
                value={healthMetric?.bodyScore ? `${healthMetric.bodyScore}/9` : null} />
              <HealthMetric icon={<SvgZap size={18} />} bg="#FEF1E2" label="活力指數"
                value={healthMetric?.vitality === 'low' ? '低落' : healthMetric?.vitality === 'medium' ? '正常' : healthMetric?.vitality === 'high' ? '活躍' : null} />
              <HealthMetric icon={<SvgDroplets size={18} />} bg="#EDF3FB" label="水分攝取"
                value={healthMetric?.waterIntake === 'low' ? '偏少' : healthMetric?.waterIntake === 'medium' ? '正常' : healthMetric?.waterIntake === 'high' ? '偏多' : null} />
            </div>
            */}

          </div>

          {/* 快速功能 */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight">快速功能</h2>

            {/* 毛孩成長分析卡 */}
            <div className="bg-[#FEF1E2] rounded-[32px] p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-5 right-5 text-[#D98A53] opacity-30">
                <SvgSparkles size={72} />
              </div>
              <h3 className="font-bold text-xl mb-2 relative z-10 text-slate-900">毛孩成長分析</h3>
              <p className="text-sm text-slate-700 font-medium mb-6 relative z-10 w-3/4">
                {currentPet && ageLabel
                  ? (() => {
                      const [y] = (ageLabel.match(/(\d+)歲/) ?? [])
                      const years = y ? parseInt(y) : 0
                      if (years < 1) return '一歲以下幼犬，建議提供高蛋白質成長配方。'
                      if (years >= 7) return '老年犬建議低磷高消化率配方，定期監測腎功能。'
                      return '成年犬維持均衡飲食，適量蛋白質與脂肪。'
                    })()
                  : '記錄日常飲食，讓 AI 追蹤毛孩健康趨勢。'
                }
              </p>
              <div className="flex flex-wrap items-center gap-2 relative z-10">
                <span className="bg-white/70 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 backdrop-blur-md shadow-sm border border-white/50">
                  今日已記錄 {todayMealCount} 餐
                </span>
              </div>
            </div>

            {/* 飲食紀錄按鈕 */}
            <Link
              href="/diet"
              className="w-full text-left bg-[#111111] rounded-[32px] p-5 flex items-center justify-between group hover:bg-black transition-colors shadow-lg shadow-black/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shrink-0">
                  <SvgPlus />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">飲食紀錄</h4>
                  <p className="text-slate-400 text-sm font-medium">記錄今天的食物或換食</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all shrink-0">
                <SvgArrowUpRight />
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
