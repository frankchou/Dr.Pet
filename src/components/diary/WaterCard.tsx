'use client'

// 飲水總量健康卡片：ml 數字輸入 + 狀態單選 pill
// value 格式：JSON string of { ml: number | null, status: string | null }

interface WaterValue {
  ml: number | null
  status: string | null
}

interface Props {
  value: string | null
  onChange: (val: string) => void
}

function IconDroplet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  )
}

const STATUS_OPTIONS = [
  { value: '飲水正常', icon: '💧' },
  { value: '異常狂喝', icon: '≈' },
  { value: '幾乎沒喝', icon: '⊘' },
] as const

function parseWaterValue(raw: string | null): WaterValue {
  if (!raw) return { ml: null, status: null }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'object' && parsed !== null && 'ml' in parsed && 'status' in parsed) {
      return parsed as WaterValue
    }
  } catch { /* ignore */ }
  return { ml: null, status: null }
}

export default function WaterCard({ value, onChange }: Props) {
  const current = parseWaterValue(value)

  function emit(patch: Partial<WaterValue>) {
    onChange(JSON.stringify({ ...current, ...patch }))
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#2C1810]">飲水總量</h3>
        <span className="text-[#C4714A] font-bold text-sm">
          {current.ml != null ? `${current.ml} ml` : '— ml'}
        </span>
        <IconDroplet />
      </div>

      {/* ml 輸入 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-slate-500">約</span>
        <input
          type="number"
          min={0}
          placeholder="0"
          value={current.ml ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            emit({ ml: raw === '' ? null : Number(raw) })
          }}
          className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#C4714A]"
        />
        <span className="text-sm text-slate-500">ml</span>
      </div>

      {/* 狀態 pill */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const isSelected = current.status === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => emit({ status: opt.value })}
              className={`px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
                isSelected
                  ? 'bg-[#C4714A]/10 border border-[#C4714A] text-[#C4714A]'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {opt.icon} {opt.value}
            </button>
          )
        })}
      </div>
    </div>
  )
}
