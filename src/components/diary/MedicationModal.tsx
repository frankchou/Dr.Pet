'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// ─── 型別 ──────────────────────────────────────────────────────────────────────

interface Props {
  petId: string
  date: string
  onClose: () => void
  onSaved: () => void
}

interface MedicationRecord {
  id: string
  petId: string
  date: string
  vaccines: string
  deworming: string
  prescriptions: string
  clinicVisits: string
  photoUrl: string | null
}

type FieldKey = 'vaccines' | 'deworming' | 'prescriptions' | 'clinicVisits'
type FieldMap = Record<FieldKey, string[]>

// ─── inline SVG ────────────────────────────────────────────────────────────────

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const CameraIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const BellIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const StethoscopeIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </svg>
)

const ClockIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

const Spinner = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
)

// ─── 常數 ──────────────────────────────────────────────────────────────────────

const EMPTY_FIELDS = (): FieldMap => ({
  vaccines: [''],
  deworming: [''],
  prescriptions: [''],
  clinicVisits: [''],
})

const FIELD_META: Array<{ key: FieldKey; label: string; placeholder: string }> = [
  { key: 'vaccines',      label: '預防針與疫苗', placeholder: '輸入/選擇疫苗名稱' },
  { key: 'deworming',     label: '點吃驅蟲用藥', placeholder: '輸入/選擇驅蟲藥品牌' },
  { key: 'prescriptions', label: '服用處方藥物', placeholder: '輸入處方藥名稱' },
  { key: 'clinicVisits',  label: '醫院門診檢查', placeholder: '輸入看診醫院/項目' },
]

// ─── helper ────────────────────────────────────────────────────────────────────

function previewText(record: MedicationRecord): string {
  const candidates = [record.vaccines, record.deworming, record.prescriptions, record.clinicVisits]
  for (const raw of candidates) {
    try {
      const arr = JSON.parse(raw) as string[]
      const first = Array.isArray(arr) ? arr.find(v => v?.trim()) : undefined
      if (first) return first
    } catch { /* 繼續 */ }
  }
  return record.date
}

function parseRecordToFields(record: MedicationRecord): FieldMap {
  const next = EMPTY_FIELDS()
  const keys: FieldKey[] = ['vaccines', 'deworming', 'prescriptions', 'clinicVisits']
  for (const key of keys) {
    try {
      const arr = JSON.parse(record[key]) as string[]
      if (Array.isArray(arr) && arr.length > 0) next[key] = arr
    } catch { /* 保留預設空值 */ }
  }
  return next
}

// ─── 主元件 ────────────────────────────────────────────────────────────────────

export default function MedicationModal({ petId, date, onClose, onSaved }: Props) {
  const [fields, setFields]             = useState<FieldMap>(EMPTY_FIELDS())
  const [history, setHistory]           = useState<MedicationRecord[]>([])
  const [photoUrl, setPhotoUrl]         = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!petId) return
    fetch(`/api/medication-record?petId=${petId}&recent=5`)
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => setHistory(Array.isArray(data) ? (data as MedicationRecord[]) : []))
      .catch(() => setHistory([]))
  }, [petId])

  const addRow = (key: FieldKey) =>
    setFields(prev => ({ ...prev, [key]: [...prev[key], ''] }))

  const updateRow = (key: FieldKey, idx: number, val: string) =>
    setFields(prev => {
      const next = [...prev[key]]
      next[idx] = val
      return { ...prev, [key]: next }
    })

  const removeRow = (key: FieldKey, idx: number) =>
    setFields(prev => {
      const next = prev[key].filter((_, i) => i !== idx)
      return { ...prev, [key]: next.length > 0 ? next : [''] }
    })

  const applyHistory = (record: MedicationRecord) => setFields(parseRecordToFields(record))

  const hasAnyValue = Object.values(fields).some(arr => arr.some(v => v.trim() !== ''))

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    const formData = new FormData()
    formData.append('file', file)
    fetch('/api/upload', { method: 'POST', body: formData })
      .then(r => r.ok ? r.json() : null)
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'url' in data) {
          setPhotoUrl((data as { url: string }).url)
        }
      })
      .catch(() => { /* 靜默降級 */ })
  }

  const handleSubmit = async () => {
    if (!hasAnyValue || !petId) return
    setSaving(true)
    setError('')
    const toArray = (arr: string[]) => arr.filter(v => v.trim() !== '')
    try {
      const res = await fetch('/api/medication-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          date,
          vaccines:      toArray(fields.vaccines),
          deworming:     toArray(fields.deworming),
          prescriptions: toArray(fields.prescriptions),
          clinicVisits:  toArray(fields.clinicVisits),
          photoUrl,
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? '儲存失敗')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl overflow-y-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FDE8E8' }}>
              <StethoscopeIcon />
            </div>
            <span className="font-bold text-lg text-[#2C1810]">用藥與看診</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="關閉"
          >
            <XIcon />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* 歷史標籤 */}
          {history.length > 0 && (
            <div className="pt-4">
              <p className="text-sm font-bold text-slate-500 mb-2">
                <ClockIcon /> 歷史標籤（點擊帶入）
              </p>
              <div className="flex flex-wrap gap-2">
                {history.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => applyHistory(rec)}
                    className="bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200"
                  >
                    {previewText(rec)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 四個輸入區塊 */}
          <div className="space-y-4 pt-2">
            {FIELD_META.map(({ key, label, placeholder }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-slate-700">{label}</span>
                  <button
                    onClick={() => addRow(key)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    aria-label={`新增${label}`}
                  >
                    <PlusIcon size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  {fields[key].map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => updateRow(key, idx, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-400 font-medium"
                      />
                      {fields[key].length > 1 && (
                        <button
                          onClick={() => removeRow(key, idx)}
                          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors text-red-400"
                          aria-label="刪除此項"
                        >
                          <XIcon />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 相片縮圖 */}
          {photoPreview && (
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="藥袋/收據預覽" className="w-full h-full object-cover" />
              <button
                onClick={() => { setPhotoPreview(null); setPhotoUrl(null) }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white"
                aria-label="移除圖片"
              >
                <XIcon />
              </button>
            </div>
          )}

          {/* 底部輔助按鈕 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 text-xs font-bold px-3 py-2 rounded-xl"
            >
              <CameraIcon />
              拍藥袋/收據
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <button
              onClick={() => alert('提醒功能即將推出')}
              className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 text-xs font-bold px-3 py-2 rounded-xl"
            >
              <BellIcon />
              下次提醒設定
            </button>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <p className="text-xs font-bold text-red-500 text-center">{error}</p>
          )}

          {/* 完成紀錄 */}
          <button
            onClick={handleSubmit}
            disabled={saving || !hasAnyValue}
            className={cn(
              'w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors',
              saving || !hasAnyValue
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#111111] text-white hover:bg-black',
            )}
          >
            {saving ? <Spinner /> : '完成紀錄'}
          </button>
        </div>
      </div>
    </div>
  )
}
