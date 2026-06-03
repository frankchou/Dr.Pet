'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { parseJson } from '@/lib/utils'
import DailyChecklist from '@/components/diary/DailyChecklist'
import DietStatusCard from '@/components/diary/DietStatusCard'
import AppetiteCard from '@/components/diary/AppetiteCard'
import WaterCard from '@/components/diary/WaterCard'
import StoolCard from '@/components/diary/StoolCard'
import UrineCard from '@/components/diary/UrineCard'
import VitalityCard from '@/components/diary/VitalityCard'
import MoodCard from '@/components/diary/MoodCard'
import SkinHairCard from '@/components/diary/SkinHairCard'
import EyeEarCard from '@/components/diary/EyeEarCard'
import DentalCard from '@/components/diary/DentalCard'
import DigestionCard from '@/components/diary/DigestionCard'
import RespiratoryCard from '@/components/diary/RespiratoryCard'
import NeuroCard from '@/components/diary/NeuroCard'
import ReproductiveCard from '@/components/diary/ReproductiveCard'
import SmartMemo from '@/components/diary/SmartMemo'
import type { RecordParam } from '@/hooks/useRecordParams'

interface DietValue {
  tab: 'all' | 'reduced' | 'forbidden'
  mealStatuses: Record<string, string>
}

interface HealthLogData {
  appetite: string | null
  waterMl: number | null
  waterStatus: string | null
  stoolType: string | null
  stoolDetails: string
  urineStatus: string | null
  vitality: string | null
  mood: string
  skinHair: string
  skinHairPhotos: string
  eyeEar: string
  eyeEarPhotos: string
  dental: string
  dentalPhotos: string
  digestion: string
  digestionPhotos: string
  respiratory: string
  neuro: string
  reproductive: string
  dailyChecklist: string
  dietStatusTab: string | null
  mealStatuses: string
}

function defaultLog(): HealthLogData {
  return {
    appetite: null,
    waterMl: null,
    waterStatus: null,
    stoolType: null,
    stoolDetails: '[]',
    urineStatus: null,
    vitality: null,
    mood: '[]',
    skinHair: '[]',
    skinHairPhotos: '[]',
    eyeEar: '[]',
    eyeEarPhotos: '[]',
    dental: '[]',
    dentalPhotos: '[]',
    digestion: '[]',
    digestionPhotos: '[]',
    respiratory: '[]',
    neuro: '[]',
    reproductive: '[]',
    dailyChecklist: '[]',
    dietStatusTab: null,
    mealStatuses: '{}',
  }
}

interface Props {
  petId: string
  date: string
  petSex: string
  params?: RecordParam[]
}

export default function HealthLogSection({ petId, date, petSex, params = [] }: Props) {
  function show(id: string): boolean {
    if (params.length === 0) return true
    const p = params.find(x => x.id === id)
    return p?.enabled ?? true
  }
  const [log, setLog] = useState<HealthLogData>(defaultLog)
  const [allHealthy, setAllHealthy] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 載入當日健康紀錄
  useEffect(() => {
    if (!petId) return
    setLog(defaultLog())
    fetch(`/api/daily-health-log?petId=${petId}&date=${date}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: HealthLogData | null) => setLog(data ?? defaultLog()))
      .catch(() => setLog(defaultLog()))
  }, [petId, date])

  const scheduleSave = useCallback((patch: Partial<HealthLogData>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!petId) return
      try {
        await fetch('/api/daily-health-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ petId, date, ...patch }),
        })
      } catch { /* 靜默 */ }
    }, 1000)
  }, [petId, date])

  function patch(p: Partial<HealthLogData>) {
    setLog(prev => ({ ...prev, ...p }))
    scheduleSave(p)
  }

  const dietValue: DietValue = {
    tab: (log.dietStatusTab as DietValue['tab']) ?? 'all',
    mealStatuses: parseJson<Record<string, string>>(log.mealStatuses, {}),
  }

  return (
    <>
      {/* SmartMemo — AI 隨記（自動標籤 + auto-fill）*/}
      <SmartMemo
        petId={petId}
        date={date}
        onApplyToLog={(logPatch) => patch(logPatch)}
      />

      {show('dailyChecklist') && (
        <DailyChecklist
          value={parseJson<string[]>(log.dailyChecklist, [])}
          onChange={(val) => patch({ dailyChecklist: JSON.stringify(val) })}
        />
      )}

      {show('dietStatus') && (
        <DietStatusCard
          petId={petId}
          date={date}
          value={dietValue}
          onChange={(val) => patch({
            dietStatusTab: val.tab,
            mealStatuses: JSON.stringify(val.mealStatuses),
          })}
        />
      )}

      {show('appetite') && (
        <AppetiteCard
          value={log.appetite}
          onChange={(val) => patch({ appetite: val })}
        />
      )}

      {show('water') && (
        <WaterCard
          value={
            log.waterMl != null || log.waterStatus != null
              ? JSON.stringify({ ml: log.waterMl, status: log.waterStatus })
              : null
          }
          onChange={(val) => {
            try {
              const parsed = JSON.parse(val) as { ml: number | null; status: string | null }
              patch({ waterMl: parsed.ml, waterStatus: parsed.status })
            } catch { /* 靜默 */ }
          }}
        />
      )}

      {show('stool') && (
        <StoolCard
          value={
            log.stoolType != null || log.stoolDetails !== '[]'
              ? JSON.stringify({ stoolType: log.stoolType, stoolDetails: parseJson<string[]>(log.stoolDetails, []) })
              : null
          }
          onChange={(val) => {
            try {
              const parsed = JSON.parse(val) as { stoolType: string | null; stoolDetails: string[] }
              patch({ stoolType: parsed.stoolType, stoolDetails: JSON.stringify(parsed.stoolDetails) })
            } catch { /* 靜默 */ }
          }}
        />
      )}

      {show('urine') && (
        <UrineCard
          value={log.urineStatus}
          onChange={(val) => patch({ urineStatus: val })}
        />
      )}

      {show('healthSymptoms') && (
      <div className="space-y-3">
        <button
          onClick={() => setAllHealthy(v => !v)}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-colors ${
            allHealthy
              ? 'bg-[#E6F7F5] border border-[#4CC9BD] text-[#2B9E91]'
              : 'bg-slate-50 border border-slate-100 text-[#8B7355]'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={allHealthy ? '#2B9E91' : '#8B7355'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            {allHealthy && <polyline points="9 12 11 14 15 10"/>}
          </svg>
          今日健康狀態良好
        </button>

        {!allHealthy && (
          <>
            <VitalityCard
              value={log.vitality}
              onChange={(val) => patch({ vitality: val })}
            />
            <MoodCard
              value={parseJson<string[]>(log.mood, [])}
              onChange={(val) => patch({ mood: JSON.stringify(val) })}
            />
            <SkinHairCard
              value={parseJson<string[]>(log.skinHair, [])}
              onChange={(val) => patch({ skinHair: JSON.stringify(val) })}
              photos={parseJson<string[]>(log.skinHairPhotos, [])}
              onPhotosChange={(urls) => patch({ skinHairPhotos: JSON.stringify(urls) })}
            />
            <EyeEarCard
              value={parseJson<string[]>(log.eyeEar, [])}
              onChange={(val) => patch({ eyeEar: JSON.stringify(val) })}
              photos={parseJson<string[]>(log.eyeEarPhotos, [])}
              onPhotosChange={(urls) => patch({ eyeEarPhotos: JSON.stringify(urls) })}
            />
            <DentalCard
              value={parseJson<string[]>(log.dental, [])}
              onChange={(val) => patch({ dental: JSON.stringify(val) })}
              photos={parseJson<string[]>(log.dentalPhotos, [])}
              onPhotosChange={(urls) => patch({ dentalPhotos: JSON.stringify(urls) })}
            />
            <DigestionCard
              value={parseJson<string[]>(log.digestion, [])}
              onChange={(val) => patch({ digestion: JSON.stringify(val) })}
              photos={parseJson<string[]>(log.digestionPhotos, [])}
              onPhotosChange={(urls) => patch({ digestionPhotos: JSON.stringify(urls) })}
            />
            <RespiratoryCard
              value={parseJson<string[]>(log.respiratory, [])}
              onChange={(val) => patch({ respiratory: JSON.stringify(val) })}
            />
            <NeuroCard
              value={parseJson<string[]>(log.neuro, [])}
              onChange={(val) => patch({ neuro: JSON.stringify(val) })}
            />
            <ReproductiveCard
              value={parseJson<string[]>(log.reproductive, [])}
              onChange={(val) => patch({ reproductive: JSON.stringify(val) })}
              sex={petSex}
            />
          </>
        )}
      </div>
      )}
    </>
  )
}
