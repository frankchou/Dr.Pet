'use client'

import { useState, useEffect, useCallback } from 'react'

// 每日任務「定義」：清單、開關、備註皆為全域設定（非每日狀態），
// 故與每日完成勾選（存在 daily-health-log.dailyChecklist）分開管理。
// 完成勾選仍以 task.key 為鍵，沿用既有 DailyChecklist value/onChange 機制，向下相容。
export interface DailyTask {
  key: string
  label: string
  // 內建項目用對應 icon；自訂任務統一用 custom icon
  icon: 'dental' | 'walk' | 'grooming' | 'custom'
  enabled: boolean
  note: string
}

export const DEFAULT_DAILY_TASKS: DailyTask[] = [
  { key: 'dental',   label: '刷牙清潔', icon: 'dental',   enabled: true, note: '' },
  { key: 'walk',     label: '日常散步', icon: 'walk',     enabled: true, note: '' },
  { key: 'grooming', label: '梳毛護理', icon: 'grooming', enabled: true, note: '' },
]

const STORAGE_KEY = 'purepaw_daily_tasks'

function loadTasks(): DailyTask[] {
  if (typeof window === 'undefined') return DEFAULT_DAILY_TASKS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DAILY_TASKS
    const stored = JSON.parse(raw) as DailyTask[]
    if (!Array.isArray(stored) || stored.length === 0) return DEFAULT_DAILY_TASKS
    // 基本健全性檢查，缺欄位的補預設值
    return stored
      .filter(t => t && typeof t.key === 'string' && typeof t.label === 'string')
      .map(t => ({
        key: t.key,
        label: t.label,
        icon: t.icon ?? 'custom',
        enabled: t.enabled ?? true,
        note: t.note ?? '',
      }))
  } catch {
    return DEFAULT_DAILY_TASKS
  }
}

export function useDailyTasks() {
  const [tasks, setTasks] = useState<DailyTask[]>(DEFAULT_DAILY_TASKS)

  useEffect(() => {
    // loadTasks 讀取 localStorage（client only），惰性初始化會造成 SSR/hydration 不一致
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasks(loadTasks())
    // 跨分頁 / 共同飼主同步：其他分頁更新 localStorage 時同步
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTasks(loadTasks())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const saveTasks = useCallback((next: DailyTask[]) => {
    setTasks(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch { /* 靜默 */ }
  }, [])

  return { tasks, saveTasks }
}
