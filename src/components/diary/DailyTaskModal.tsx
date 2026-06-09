'use client'

import { useState } from 'react'
import type { DailyTask } from '@/hooks/useDailyTasks'

interface Props {
  tasks: DailyTask[]
  onClose: () => void
  onSave: (tasks: DailyTask[]) => void
}

/* ── inline SVG ──────────────────────────────────── */

const XIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={size} height={size}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const PlusIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const PencilIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
)

function TaskIcon({ icon }: { icon: DailyTask['icon'] }) {
  if (icon === 'dental') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <path d="M18 4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4h12z" />
        <path d="M6 8v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    )
  }
  if (icon === 'walk') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <path d="M4 16s.5-2 4-2 5 2 8 2 4-2 4-2" />
        <circle cx="8" cy="8" r="2" />
        <circle cx="13" cy="6" r="2" />
        <circle cx="18" cy="9" r="1.5" />
      </svg>
    )
  }
  if (icon === 'grooming') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    )
  }
  // 自訂任務
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

const ICON_BG: Record<DailyTask['icon'], string> = {
  dental: '#FEF1E2',
  walk: '#FDE8E8',
  grooming: '#FEF1E2',
  custom: '#EDF3FB',
}

/* ── Toggle ──────────────────────────────────────── */

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`w-12 h-7 rounded-full p-0.5 flex items-center transition-colors shrink-0 ${
        on ? 'bg-[#9CA98E] justify-end' : 'bg-slate-200 justify-start'
      }`}
    >
      <span className="w-6 h-6 rounded-full bg-white shadow-sm" />
    </button>
  )
}

/* ── 主元件 ──────────────────────────────────────── */

export default function DailyTaskModal({ tasks, onClose, onSave }: Props) {
  // 在本地暫存編輯，按「完成設定」才寫回；關閉不儲存
  const [draft, setDraft] = useState<DailyTask[]>(() => tasks.map(t => ({ ...t })))
  const [newLabel, setNewLabel] = useState('')

  const toggle = (key: string) =>
    setDraft(prev => prev.map(t => (t.key === key ? { ...t, enabled: !t.enabled } : t)))

  const updateNote = (key: string, note: string) =>
    setDraft(prev => prev.map(t => (t.key === key ? { ...t, note } : t)))

  const disableAll = () => setDraft(prev => prev.map(t => ({ ...t, enabled: false })))

  const addCustom = () => {
    const label = newLabel.trim()
    if (!label) return
    // 自訂任務 key 帶前綴避免與內建衝突；新增任務預設開啟（依設計）
    const key = `custom_${Date.now()}`
    setDraft(prev => [...prev, { key, label, icon: 'custom', enabled: true, note: '' }])
    setNewLabel('')
  }

  const removeTask = (key: string) =>
    setDraft(prev => prev.filter(t => t.key !== key))

  const handleSave = () => {
    onSave(draft)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-bold text-xl text-[#2C1810]">每日任務管理</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">啟動後將每日預設於列表中，備註細節將顯示於紀錄中。</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors shrink-0"
            aria-label="關閉"
          >
            <XIcon />
          </button>
        </div>

        {/* 可捲動內容 */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-4"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-400">管理與備註</span>
            <button
              onClick={disableAll}
              className="text-sm font-bold text-[#D98A53] hover:underline"
            >
              全部取消
            </button>
          </div>

          <div className="space-y-3">
            {draft.map((task) => (
              <div key={task.key} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: ICON_BG[task.icon], color: '#D98A53' }}
                  >
                    <TaskIcon icon={task.icon} />
                  </div>
                  <span className="flex-1 font-bold text-[#2C1810]">{task.label}</span>
                  {/* 自訂任務可刪除 */}
                  {task.icon === 'custom' && (
                    <button
                      onClick={() => removeTask(task.key)}
                      className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 shrink-0 transition-colors"
                      aria-label={`刪除${task.label}`}
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                  <Toggle on={task.enabled} onClick={() => toggle(task.key)} />
                </div>
                {/* 備註欄 */}
                <div className="mt-3 flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                  <span className="text-slate-300 shrink-0"><PencilIcon /></span>
                  <input
                    type="text"
                    value={task.note}
                    onChange={(e) => updateNote(task.key, e.target.value)}
                    placeholder="固定備註項目 (例: 15分鐘)"
                    className="flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 新增自訂任務 */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-1.5">
              <PlusIcon size={14} /> 新增自訂任務
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                placeholder="項目名稱 (例: 點眼藥水)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
              />
              <button
                onClick={addCustom}
                disabled={!newLabel.trim()}
                className="w-12 h-12 rounded-2xl bg-[#2C1810] text-white flex items-center justify-center shrink-0 disabled:opacity-30 hover:bg-black transition-colors"
                aria-label="新增任務"
              >
                <PlusIcon size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* 完成設定（置底）*/}
        <div
          className="shrink-0 px-5 pt-3 border-t border-slate-100"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleSave}
            className="w-full py-4 rounded-2xl bg-[#2C1810] text-white text-base font-bold hover:bg-black transition-colors"
          >
            完成設定
          </button>
        </div>
      </div>
    </div>
  )
}
