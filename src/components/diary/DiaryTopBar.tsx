'use client'

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface DiaryTopBarProps {
  onOpenMedication: () => void
  onOpenGrooming: () => void
  onOpenMeasurement: () => void
  showMedication?: boolean
  showGrooming?: boolean
  showMeasurement?: boolean
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

// 用藥看診 icon（藥丸）
const PillIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3.5" />
    <circle cx="17" cy="17" r="5" />
    <path d="m14.5 14.5 5 5" />
  </svg>
)

// 洗澡美容 icon（剪刀）
const ScissorsIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4"  x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12"  y1="8.12"  x2="12" y2="12" />
  </svg>
)

// 量測紀錄 icon（磅秤）
const ScaleIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12l1 6H5L6 3z" />
    <path d="M5 9c0 4.42 3.13 8 7 8s7-3.58 7-8" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="8"  y1="21" x2="16" y2="21" />
  </svg>
)

// ─── 快捷按鈕 ─────────────────────────────────────────────────────────────────

interface ShortcutButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function ShortcutButton({ icon, label, onClick }: ShortcutButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 bg-white border border-slate-200 rounded-2xl py-3 flex flex-col items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors active:scale-95"
    >
      <div className="w-9 h-9 rounded-xl bg-[#FEF1E2] flex items-center justify-center">
        {icon}
      </div>
      <span>{label}</span>
    </button>
  )
}

// ─── DiaryTopBar ──────────────────────────────────────────────────────────────

export default function DiaryTopBar({
  onOpenMedication, onOpenGrooming, onOpenMeasurement,
  showMedication = true, showGrooming = true, showMeasurement = true,
}: DiaryTopBarProps) {
  const buttons = [
    showMedication && <ShortcutButton key="med" icon={<PillIcon />}     label="用藥看診" onClick={onOpenMedication} />,
    showGrooming   && <ShortcutButton key="grm" icon={<ScissorsIcon />} label="洗澡美容" onClick={onOpenGrooming} />,
    showMeasurement && <ShortcutButton key="msr" icon={<ScaleIcon />}   label="量測紀錄" onClick={onOpenMeasurement} />,
  ].filter(Boolean)

  if (buttons.length === 0) return null

  return (
    <div className="flex gap-2">
      {buttons}
    </div>
  )
}
