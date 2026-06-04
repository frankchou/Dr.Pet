'use client'

import { useState, useEffect } from 'react'
import { parseJson } from '@/lib/utils'

interface HealthLogData {
  date: string
  appetite: string | null
  waterMl: number | null
  waterStatus: string | null
  stoolType: string | null
  urineStatus: string | null
  vitality: string | null
  mood: string
  skinHair: string
  eyeEar: string
  dental: string
  digestion: string
  respiratory: string
  neuro: string
  reproductive: string
}

interface Props {
  petId: string
  date: string           // 選取的日期（YYYY-MM-DD），用於單日摘要
  // 本月「任何紀錄來源」的不重複天數（與月曆圓點同義）。
  // 用於「已記錄 X / 當月天數」徽章；健康良好／異常仍以 DailyHealthLog 計算。
  recordedCount?: number
}

function Pill({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  )
}

const VITALITY_COLOR: Record<string, string> = {
  '精神飽滿':   'bg-emerald-50 text-emerald-700 border-emerald-200',
  '活動意願高': 'bg-sky-50 text-sky-700 border-sky-200',
  '異常疲倦':   'bg-amber-50 text-amber-700 border-amber-200',
}
const APPETITE_COLOR: Record<string, string> = {
  '胃口極佳':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  '食慾正常':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  '猶豫慢食':  'bg-amber-50 text-amber-700 border-amber-200',
  '挑食偏食':  'bg-amber-50 text-amber-700 border-amber-200',
  '完全拒食':  'bg-red-50 text-red-700 border-red-200',
}
const WATER_COLOR: Record<string, string> = {
  '飲水正常':  'bg-sky-50 text-sky-700 border-sky-200',
  '異常狂喝':  'bg-amber-50 text-amber-700 border-amber-200',
  '幾乎沒喝':  'bg-red-50 text-red-700 border-red-200',
}

// 多選觀察欄位（值以 JSON 陣列字串儲存）
//
// `normalValues`：該欄位的「正常值白名單」。只有出現「不在白名單」的值才算異常觀察。
// 情緒行為（MoodCard）含正常值（平靜放鬆／活潑好動），其餘卡片所有選項都是異常徵兆，
// 因此 normalValues 為空集合，代表「有值即異常」。
const MULTI_FIELDS: Array<{
  key: keyof HealthLogData
  label: string
  normalValues: Set<string>
}> = [
  { key: 'mood',         label: '情緒行為',   normalValues: new Set(['平靜放鬆', '活潑好動']) },
  { key: 'skinHair',     label: '皮膚毛髮',   normalValues: new Set() },
  { key: 'eyeEar',       label: '眼耳',       normalValues: new Set() },
  { key: 'dental',       label: '牙齒口腔',   normalValues: new Set() },
  { key: 'digestion',    label: '消化系統',   normalValues: new Set() },
  { key: 'respiratory',  label: '呼吸',       normalValues: new Set() },
  { key: 'neuro',        label: '神經溫控',   normalValues: new Set() },
  { key: 'reproductive', label: '生殖分泌',   normalValues: new Set() },
]

// 單選觀察欄位的正常值白名單，用於判斷該日是否有異常
const VITALITY_NORMAL = new Set(['精神飽滿', '活動意願高'])
const APPETITE_NORMAL = new Set(['胃口極佳', '食慾正常'])
const WATER_NORMAL    = new Set(['飲水正常'])
const STOOL_NORMAL    = new Set(['正常成形', '羊便便(硬)'])
const URINE_NORMAL    = new Set(['尿量正常'])

// 回傳某多選欄位中「非正常值」的清單（即異常觀察值）
function abnormalMultiValues(
  log: HealthLogData,
  field: { key: keyof HealthLogData; normalValues: Set<string> }
): string[] {
  return parseJson<string[]>(log[field.key] as string, []).filter(
    v => !field.normalValues.has(v)
  )
}

// 該日是否含任何異常觀察（統一以 DailyHealthLog 判斷）
function hasAbnormality(log: HealthLogData): boolean {
  if (log.vitality && !VITALITY_NORMAL.has(log.vitality)) return true
  if (log.appetite && !APPETITE_NORMAL.has(log.appetite)) return true
  if (log.waterStatus && !WATER_NORMAL.has(log.waterStatus)) return true
  if (log.stoolType && !STOOL_NORMAL.has(log.stoolType)) return true
  if (log.urineStatus && !URINE_NORMAL.has(log.urineStatus)) return true
  return MULTI_FIELDS.some(f => abnormalMultiValues(log, f).length > 0)
}

// 計算頻率最高的值
function topValue(vals: (string | null)[]): string | null {
  const counts: Record<string, number> = {}
  for (const v of vals) {
    if (v) counts[v] = (counts[v] ?? 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

// 計算每個值出現的天數，排除 null/空字串
function countByValue(vals: (string | null)[]): Array<[string, number]> {
  const counts: Record<string, number> = {}
  for (const v of vals) {
    if (v && v.trim()) counts[v] = (counts[v] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

// 各指標的 pill 顏色判斷
function vitalityColor(val: string): string {
  if (val === '精神飽滿' || val === '活動意願高') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}
function appetiteColor(val: string): string {
  if (val === '胃口極佳' || val === '食慾正常') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (val === '完全拒食') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}
function waterColor(val: string): string {
  if (val === '飲水正常') return 'bg-sky-50 text-sky-700 border-sky-200'
  if (val === '幾乎沒喝') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

interface MetricSectionProps {
  title: string
  items: Array<[string, number]>
  colorFn: (val: string) => string
}

function MetricSection({ title, items, colorFn }: MetricSectionProps) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-300">本月無記錄</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(([val, days]) => (
            <Pill key={val} label={`${val} ${days}天`} colorClass={colorFn(val)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MonthHealthOverview({ petId, date, recordedCount: unionRecordedCount }: Props) {
  const [monthLogs, setMonthLogs] = useState<HealthLogData[]>([])
  const [dayLog, setDayLog]       = useState<HealthLogData | null>(null)
  const [loading, setLoading]     = useState(false)

  const yearMonth = date.slice(0, 7)          // YYYY-MM
  const monthNum  = parseInt(date.split('-')[1], 10)

  const totalDays = new Date(parseInt(date.slice(0, 4)), parseInt(date.slice(5, 7)), 0).getDate()

  // 取整月 logs
  useEffect(() => {
    if (!petId) return
    setLoading(true)
    fetch(`/api/daily-health-log?petId=${petId}&yearMonth=${yearMonth}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: HealthLogData[]) => setMonthLogs(data))
      .catch(() => setMonthLogs([]))
      .finally(() => setLoading(false))
  }, [petId, yearMonth])

  // 取單日 log
  useEffect(() => {
    if (!petId || !date) return
    setDayLog(null)
    fetch(`/api/daily-health-log?petId=${petId}&date=${date}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: HealthLogData | null) => setDayLog(data))
      .catch(() => setDayLog(null))
  }, [petId, date])

  // ── 月份統計 ────────────────────────────────────────────────────────────────
  // 健康相關統計「一律以 DailyHealthLog 為基準」，避免把「只有飲食紀錄的日子」誤算成健康良好。
  // 有健康日誌的不重複天數
  const healthLogDays = new Set(monthLogs.map(l => l.date)).size
  // 有異常天數：含任何非正常觀察值的天數（正常值白名單見 MULTI_FIELDS / *_NORMAL）
  const abnormalDays  = monthLogs.filter(hasAbnormality).length
  // 健康良好天數：有日誌但無異常 = 健康日誌天數 − 有異常天數（同源，必不為負）
  const healthyDays   = healthLogDays - abnormalDays

  // 「已記錄天數」與月曆圓點同義：本月任何紀錄來源的不重複天數（由父層聚合傳入）。
  // 未傳入時退回健康日誌天數，避免顯示 0。
  const recordedCount = unionRecordedCount ?? healthLogDays

  // 月份聚合
  const vitalityTop  = topValue(monthLogs.map(l => l.vitality))
  const appetiteTop  = topValue(monthLogs.map(l => l.appetite))
  const waterTop     = topValue(monthLogs.map(l => l.waterStatus))

  // 月份有「異常觀察」的部位（跨天合計出現天數；正常值不計）
  const sectionHits: Record<string, number> = {}
  for (const log of monthLogs) {
    for (const f of MULTI_FIELDS) {
      if (abnormalMultiValues(log, f).length > 0) {
        sectionHits[f.label] = (sectionHits[f.label] ?? 0) + 1
      }
    }
  }
  const topSections = Object.entries(sectionHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  // ── 各指標月份分佈（新增） ────────────────────────────────────────────────
  const vitalityDist  = countByValue(monthLogs.map(l => l.vitality))
  const appetiteDist  = countByValue(monthLogs.map(l => l.appetite))
  const waterDist     = countByValue(monthLogs.map(l => l.waterStatus))
  // 排便：只統計非空值
  const stoolDist     = countByValue(monthLogs.map(l => l.stoolType))
  // 泌尿：只統計異常值（排除「尿量正常」）
  const urineDist     = countByValue(
    monthLogs.map(l => (l.urineStatus && !URINE_NORMAL.has(l.urineStatus) ? l.urineStatus : null))
  )
  // 症狀觀察：各部位有「異常觀察」的天數（正常值不計，例如情緒「平靜放鬆」）
  const symptomDist: Array<[string, number]> = MULTI_FIELDS
    .map(f => {
      const days = monthLogs.filter(l => abnormalMultiValues(l, f).length > 0).length
      return [f.label, days] as [string, number]
    })
    .filter(([, days]) => days > 0)
    .sort((a, b) => b[1] - a[1])

  const displayDate = (() => {
    const [, m, d] = date.split('-')
    return `${parseInt(m)} 月 ${parseInt(d)} 日`
  })()

  const dayObserved = dayLog
    ? MULTI_FIELDS.filter(f => abnormalMultiValues(dayLog, f).length > 0)
    : []

  return (
    <div className="space-y-4">

      {/* ── 本月健康摘要 ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#2C1810]">{monthNum} 月健康摘要</h3>
          <span className="text-xs font-medium text-[#8B7355] bg-[#FAF7F2] px-3 py-1 rounded-full">
            已記錄 {recordedCount} / {totalDays} 天
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-[#C4714A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : monthLogs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-3">本月尚無健康紀錄</p>
        ) : (
          <div className="space-y-4">
            {/* 白話摘要：區分「任何紀錄」與「健康日誌」兩種口徑，語意清楚 */}
            <p className="text-sm text-[#2C1810] bg-[#FAF7F2] rounded-xl px-3 py-2.5 leading-relaxed">
              本月 <span className="font-bold">{recordedCount}</span> 天有紀錄，其中
              <span className="font-bold">{healthLogDays}</span> 天有健康日誌、
              <span className="font-bold text-emerald-700">{healthyDays}</span> 天狀況良好
              {abnormalDays > 0 && (
                <>，<span className="font-bold text-amber-700">{abnormalDays}</span> 天有異常觀察</>
              )}
              。
            </p>

            {/* 統計數字 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-[#2C1810]">{recordedCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">健康日誌天數</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-700">{healthyDays}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">健康良好</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${abnormalDays > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <p className={`text-2xl font-black ${abnormalDays > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{abnormalDays}</p>
                <p className={`text-[11px] mt-0.5 ${abnormalDays > 0 ? 'text-amber-600' : 'text-slate-400'}`}>有異常</p>
              </div>
            </div>

            {/* 本月最常見狀態（舊版摘要，保留向下相容） */}
            {(vitalityTop || appetiteTop || waterTop) && (
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">本月最常見狀態</p>
                <div className="flex flex-wrap gap-2">
                  {vitalityTop && <Pill label={`活力 ${vitalityTop}`} colorClass={VITALITY_COLOR[vitalityTop] ?? 'bg-slate-50 text-slate-600 border-slate-200'} />}
                  {appetiteTop && <Pill label={`食慾 ${appetiteTop}`} colorClass={APPETITE_COLOR[appetiteTop] ?? 'bg-slate-50 text-slate-600 border-slate-200'} />}
                  {waterTop    && <Pill label={`飲水 ${waterTop}`}    colorClass={WATER_COLOR[waterTop]    ?? 'bg-slate-50 text-slate-600 border-slate-200'} />}
                </div>
              </div>
            )}

            {/* 本月常見觀察部位（舊版，保留） */}
            {topSections.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">本月常見觀察部位</p>
                <div className="flex flex-wrap gap-2">
                  {topSections.map(([label, count]) => (
                    <Pill key={label} label={`${label} ${count}天`} colorClass="bg-amber-50 text-amber-700 border-amber-200" />
                  ))}
                </div>
              </div>
            )}

            {/* ── 各指標每月分佈 ───────────────────────────────────────── */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <p className="text-xs font-bold text-slate-500">各指標每月分佈</p>

              <MetricSection
                title="活力指數"
                items={vitalityDist}
                colorFn={vitalityColor}
              />

              <MetricSection
                title="食慾"
                items={appetiteDist}
                colorFn={appetiteColor}
              />

              <MetricSection
                title="飲水"
                items={waterDist}
                colorFn={waterColor}
              />

              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">排便</p>
                {stoolDist.length === 0 ? (
                  <p className="text-xs text-slate-300">本月無記錄</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {stoolDist.map(([val, days]) => (
                      <Pill
                        key={val}
                        label={`${val} ${days}天`}
                        colorClass={
                          val === '正常成形'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : val === '帶血便' || val === '嚴重腹瀉'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">泌尿異常</p>
                {urineDist.length === 0 ? (
                  <p className="text-xs text-slate-300">本月無異常</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {urineDist.map(([val, days]) => (
                      <Pill
                        key={val}
                        label={`${val} ${days}天`}
                        colorClass={
                          val === '血尿'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">症狀觀察</p>
                {symptomDist.length === 0 ? (
                  <p className="text-xs text-slate-300">本月無記錄</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {symptomDist.map(([label, days]) => (
                      <Pill
                        key={label}
                        label={`${label} ${days}天`}
                        colorClass="bg-amber-50 text-amber-700 border-amber-200"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 單日健康摘要 ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-bold text-[#2C1810] mb-4">{displayDate} 健康摘要</h3>

        {!dayLog ? (
          <div className="py-4 text-center">
            <p className="text-sm text-slate-400">本日尚無健康紀錄</p>
            <p className="text-xs text-slate-300 mt-1">切換至週曆頁面可新增今日紀錄</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {dayLog.vitality    && <Pill label={`活力：${dayLog.vitality}`}    colorClass={VITALITY_COLOR[dayLog.vitality] ?? 'bg-slate-50 text-slate-600 border-slate-200'} />}
              {dayLog.appetite    && <Pill label={`食慾：${dayLog.appetite}`}    colorClass={APPETITE_COLOR[dayLog.appetite] ?? 'bg-slate-50 text-slate-600 border-slate-200'} />}
              {dayLog.waterStatus && <Pill label={`飲水：${dayLog.waterStatus}`} colorClass={WATER_COLOR[dayLog.waterStatus]  ?? 'bg-slate-50 text-slate-600 border-slate-200'} />}
              {dayLog.waterMl != null && dayLog.waterMl > 0 && <Pill label={`約 ${dayLog.waterMl} ml`} colorClass="bg-slate-50 text-slate-600 border-slate-200" />}
              {dayLog.stoolType   && <Pill label={`排便：${dayLog.stoolType}`}   colorClass="bg-slate-50 text-slate-600 border-slate-200" />}
              {dayLog.urineStatus && <Pill label={`泌尿：${dayLog.urineStatus}`} colorClass="bg-slate-50 text-slate-600 border-slate-200" />}
            </div>
            {dayObserved.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">有觀察紀錄</p>
                <div className="flex flex-wrap gap-2">
                  {dayObserved.map(s => <Pill key={s.key} label={s.label} colorClass="bg-amber-50 text-amber-700 border-amber-200" />)}
                </div>
              </div>
            )}
            {!dayLog.vitality && !dayLog.appetite && !dayLog.waterStatus && dayObserved.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-2">本日紀錄尚未完整填寫</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
