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

// 飲水正常：水滴
function IconDroplet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  )
}

// 異常狂喝：三條波浪線
function IconWaves() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <path d="M2 8c1.5-2 3-3 4.5-3S9 6 10.5 6 13.5 3 15 3s3 2 4.5 2 3-2 3-2"/>
      <path d="M2 13c1.5-2 3-3 4.5-3S9 11 10.5 11 13.5 8 15 8s3 2 4.5 2 3-2 3-2"/>
      <path d="M2 18c1.5-2 3-3 4.5-3S9 16 10.5 16 13.5 13 15 13s3 2 4.5 2 3-2 3-2"/>
    </svg>
  )
}

// 幾乎沒喝：禁止圓圈
function IconBan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  )
}

interface WaterStatusOption {
  value: string
  icon: React.ReactNode
}

const STATUS_OPTIONS: WaterStatusOption[] = [
  { value: '飲水正常', icon: <IconDroplet /> },
  { value: '異常狂喝', icon: <IconWaves /> },
  { value: '幾乎沒喝', icon: <IconBan /> },
]

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
        {/* pill 形狀的 ml 輸入區 */}
        <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-4 py-2">
          <span className="text-sm text-[#8B7355]">約</span>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={current.ml ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              emit({ ml: raw === '' ? null : Number(raw) })
            }}
            className="w-14 bg-transparent text-center text-sm font-medium text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-sm text-[#8B7355]">ml</span>
        </div>
      </div>

      {/* 狀態 pill */}
      <div className="grid grid-cols-2 gap-2">
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
