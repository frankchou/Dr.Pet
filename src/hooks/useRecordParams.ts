'use client'

import { useState, useEffect } from 'react'

export interface RecordParam {
  id: string
  label: string
  enabled: boolean
  group: 'shortcuts' | 'daily' | 'symptoms'
}

export const DEFAULT_RECORD_PARAMS: RecordParam[] = [
  // 快捷紀錄（DiaryTopBar）
  { id: 'medication',     label: '用藥看診',     enabled: true,  group: 'shortcuts' },
  { id: 'grooming',       label: '洗澡美容',     enabled: true,  group: 'shortcuts' },
  { id: 'measurement',    label: '量測紀錄',     enabled: true,  group: 'shortcuts' },
  // 每日健康填寫（HealthLogSection 主體）
  { id: 'dailyChecklist', label: '每日例行清單', enabled: true,  group: 'daily' },
  { id: 'dietStatus',     label: '今日飲食狀態', enabled: true,  group: 'daily' },
  { id: 'appetite',       label: '食慾咀嚼',     enabled: true,  group: 'daily' },
  { id: 'water',          label: '飲水量',       enabled: true,  group: 'daily' },
  { id: 'stool',          label: '排便狀況',     enabled: true,  group: 'daily' },
  { id: 'urine',          label: '泌尿狀況',     enabled: true,  group: 'daily' },
  // 症狀觀察（allHealthy toggle + 9 張卡片）
  { id: 'healthSymptoms', label: '症狀觀察',     enabled: true,  group: 'symptoms' },
]

const STORAGE_KEY = 'purepaw_record_params'

// 舊格式（數字 id）遷移映射
const LEGACY_ID_MAP: Record<string, string> = {
  '2': 'medication',
  '3': 'grooming',
  '4': 'measurement',
  '5': 'water',
  '8': 'stool',
  '11': 'healthSymptoms',
}

function loadParams(): RecordParam[] {
  if (typeof window === 'undefined') return DEFAULT_RECORD_PARAMS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_RECORD_PARAMS

    const stored = JSON.parse(raw) as Array<{ id: string; label: string; enabled: boolean }>

    // 檢查是否為舊格式（id 為純數字字串）
    const isLegacy = stored.some(p => /^\d+$/.test(p.id))
    if (isLegacy) {
      // 遷移：把舊 id 有對應的帶入新格式 enabled 值
      const legacyMap = Object.fromEntries(stored.map(p => [p.id, p.enabled]))
      const migrated = DEFAULT_RECORD_PARAMS.map(p => {
        const legacyId = Object.entries(LEGACY_ID_MAP).find(([, v]) => v === p.id)?.[0]
        return legacyId !== undefined ? { ...p, enabled: legacyMap[legacyId] ?? p.enabled } : p
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      return migrated
    }

    // 新格式：用儲存的 enabled 覆蓋 DEFAULT（保留未來新增的項目）
    const storedMap = Object.fromEntries(stored.map(p => [p.id, p.enabled]))
    return DEFAULT_RECORD_PARAMS.map(p =>
      p.id in storedMap ? { ...p, enabled: storedMap[p.id] } : p
    )
  } catch {
    return DEFAULT_RECORD_PARAMS
  }
}

export function useRecordParams() {
  const [params, setParams] = useState<RecordParam[]>(DEFAULT_RECORD_PARAMS)

  useEffect(() => {
    setParams(loadParams())
  }, [])

  function isEnabled(id: string): boolean {
    const p = params.find(x => x.id === id)
    return p?.enabled ?? true  // 找不到 id 時預設顯示
  }

  return { params, isEnabled }
}
