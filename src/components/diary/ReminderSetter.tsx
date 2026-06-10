'use client'

import { cn } from '@/lib/utils'

// ─── 型別 ──────────────────────────────────────────────────────────────────────

// 提醒設定的狀態：由各 Modal 持有並一併隨紀錄 POST 出去。
// reminderDate: 'YYYY-MM-DD'，空字串 = 不設提醒。
// intervalDays: null = 一次性、>0 = 每 N 天循環。
export interface ReminderState {
  reminderDate: string
  intervalDays: number | null
}

export const EMPTY_REMINDER = (): ReminderState => ({
  reminderDate: '',
  intervalDays: null,
})

interface Props {
  value: ReminderState
  onChange: (next: ReminderState) => void
  // 各情境的週期快捷（如驅蟲 30 天、美容 60 天），由呼叫端帶入
  cyclePresets: Array<{ days: number; label: string }>
}

// 將 ReminderState 轉成 POST body 用的欄位（nextReminder / reminderIntervalDays）。
// 未設日期 → 兩者皆 undefined（route 會存 null）。
export function reminderToPayload(state: ReminderState): {
  nextReminder?: string
  reminderIntervalDays?: number
} {
  if (!state.reminderDate) return {}
  return {
    // 存當地日期當天 00:00（DateTime），cron 端再以台灣時區換算「今天到期」
    nextReminder: state.reminderDate,
    reminderIntervalDays: state.intervalDays ?? undefined,
  }
}

// ─── inline SVG ────────────────────────────────────────────────────────────────

const BellIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

// ─── 主元件 ────────────────────────────────────────────────────────────────────

// 「下次提醒設定」面板：選提醒日期 + 一次性 / 週期（每 N 天）。
// 提醒採 Web Push，需使用者已在設定頁開啟通知；此處只負責寫入該筆紀錄的提醒設定。
export default function ReminderSetter({ value, onChange, cyclePresets }: Props) {
  const enabled = value.reminderDate !== ''

  const toggle = () => {
    if (enabled) {
      onChange(EMPTY_REMINDER())
    } else {
      // 預設帶入「30 天後」當提醒日，使用者可再調整
      const d = new Date()
      d.setDate(d.getDate() + 30)
      onChange({ reminderDate: d.toISOString().slice(0, 10), intervalDays: null })
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 w-full px-4 py-3 text-xs font-bold text-slate-700 text-left transition-colors hover:bg-slate-100"
      >
        <BellIcon />
        下次提醒設定
        {enabled && <span className="ml-auto text-[#C4714A]">已設定</span>}
      </button>

      {enabled && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">提醒日期</label>
            <input
              type="date"
              value={value.reminderDate}
              onChange={(e) => onChange({ ...value, reminderDate: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">提醒頻率</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onChange({ ...value, intervalDays: null })}
                className={cn(
                  'text-xs font-bold px-3 py-1.5 rounded-full border transition-colors',
                  value.intervalDays === null
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100',
                )}
              >
                一次性
              </button>
              {cyclePresets.map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => onChange({ ...value, intervalDays: preset.days })}
                  className={cn(
                    'text-xs font-bold px-3 py-1.5 rounded-full border transition-colors',
                    value.intervalDays === preset.days
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {value.intervalDays !== null && (
              <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
                每 {value.intervalDays} 天循環提醒，到期後自動順延下次
              </p>
            )}
          </div>

          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            提醒以推播通知發送，請先到「設定」開啟用藥/美容提醒通知。
          </p>
        </div>
      )}
    </div>
  )
}
