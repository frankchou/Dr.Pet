'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'

// ─── 型別 ──────────────────────────────────────────────────────────────────────

interface Props {
  petId: string
  date: string
  onClose: () => void
  onSaved: () => void
}

type GroomingMode = 'home' | 'shop' | 'full'

// ─── inline SVG ────────────────────────────────────────────────────────────────

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={14} height={14}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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

const BathIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#5B7FBB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6L9 2" />
    <path d="M15 6L15 2" />
    <path d="M2 12h20" />
    <path d="M2 12v4a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6v-4" />
    <path d="M4 12V7a2 2 0 0 1 2-2h3" />
    <path d="M2 20h20" />
  </svg>
)

const Spinner = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
)

// ─── 進階療程設定 ──────────────────────────────────────────────────────────────

interface TreatmentItem {
  key: 'medBath' | 'carbonatedSpa' | 'dentalClean' | 'customTreatment'
  label: string
  inputLabel: string
  placeholder: string
}

const TREATMENT_ITEMS: TreatmentItem[] = [
  { key: 'medBath',         label: '處方用藥浴',    inputLabel: '洗劑/藥浴名稱',      placeholder: '輸入洗劑/藥浴名稱' },
  { key: 'carbonatedSpa',   label: '碳酸泉/皮毛SPA', inputLabel: '入浴劑/護理品名稱',  placeholder: '輸入入浴劑/護理品名稱' },
  { key: 'dentalClean',     label: '牙刷深度潔牙',  inputLabel: '牙膏/潔牙凝膠名稱',  placeholder: '輸入牙膏/潔牙凝膠名稱' },
  { key: 'customTreatment', label: '自訂特殊護理',  inputLabel: '療程名稱',            placeholder: '輸入療程名稱' },
]

const PRODUCT_FIELD_MAP: Record<TreatmentItem['key'], 'medBathProduct' | 'carbonatedProduct' | 'dentalProduct' | 'customName'> = {
  medBath:         'medBathProduct',
  carbonatedSpa:   'carbonatedProduct',
  dentalClean:     'dentalProduct',
  customTreatment: 'customName',
}

type TreatmentChecked = Record<TreatmentItem['key'], boolean>
type TreatmentProducts = Record<'medBathProduct' | 'carbonatedProduct' | 'dentalProduct' | 'customName', string>

const EMPTY_CHECKED = (): TreatmentChecked => ({
  medBath: false, carbonatedSpa: false, dentalClean: false, customTreatment: false,
})
const EMPTY_PRODUCTS = (): TreatmentProducts => ({
  medBathProduct: '', carbonatedProduct: '', dentalProduct: '', customName: '',
})

// ─── 主元件 ────────────────────────────────────────────────────────────────────

export default function GroomingModal({ petId, date, onClose, onSaved }: Props) {
  const [mode, setMode]           = useState<GroomingMode>('home')
  const [checked, setChecked]     = useState<TreatmentChecked>(EMPTY_CHECKED())
  const [products, setProducts]   = useState<TreatmentProducts>(EMPTY_PRODUCTS())
  const [photoUrl, setPhotoUrl]   = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const fileInputRef              = useRef<HTMLInputElement>(null)

  const toggleTreatment = (key: TreatmentItem['key']) =>
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))

  const updateProduct = (field: TreatmentProducts[keyof TreatmentProducts] extends string ? keyof TreatmentProducts : never, val: string) =>
    setProducts(prev => ({ ...prev, [field]: val }))

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
    if (!petId) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/grooming-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          date,
          mode,
          medBath:           checked.medBath,
          medBathProduct:    checked.medBath ? products.medBathProduct : undefined,
          carbonatedSpa:     checked.carbonatedSpa,
          carbonatedProduct: checked.carbonatedSpa ? products.carbonatedProduct : undefined,
          dentalClean:       checked.dentalClean,
          dentalProduct:     checked.dentalClean ? products.dentalProduct : undefined,
          customTreatment:   checked.customTreatment,
          customName:        checked.customTreatment ? products.customName : undefined,
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
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8EEF9' }}>
              <BathIcon />
            </div>
            <span className="font-bold text-lg text-[#2C1810]">洗澡美容</span>
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
          {/* 模式選擇 */}
          <div className="pt-4">
            <p className="text-sm font-bold text-slate-500 mb-3">模式選擇（單選）</p>
            <div className="space-y-2.5">
              {([
                { k: 'home' as GroomingMode, l: '居家自洗' },
                { k: 'shop' as GroomingMode, l: '基礎小美容（送洗）' },
                { k: 'full' as GroomingMode, l: '全身大美容（送洗）' },
              ]).map(({ k, l }) => (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  className={cn(
                    'flex items-center gap-3 w-full text-sm font-bold transition-colors',
                    mode === k ? 'text-[#2C1810]' : 'text-slate-400',
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors shrink-0',
                    mode === k ? 'bg-[#111111] border-[#111111] text-white' : 'border-slate-300 bg-white',
                  )}>
                    {mode === k && <CheckIcon size={12} />}
                  </div>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* 進階療程 */}
          <div>
            <p className="text-sm font-bold text-slate-500 mb-3">進階療程與產品（可勾選）</p>
            <div className="space-y-3">
              {TREATMENT_ITEMS.map((item) => {
                const productField = PRODUCT_FIELD_MAP[item.key]
                const isChecked = checked[item.key]
                return (
                  <div key={item.key} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
                    <button
                      onClick={() => toggleTreatment(item.key)}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-left transition-colors hover:bg-slate-100"
                    >
                      <div className={cn(
                        'w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0',
                        isChecked ? 'bg-[#111111] border-[#111111] text-white' : 'border-slate-300 bg-white',
                      )}>
                        {isChecked && <CheckIcon size={12} />}
                      </div>
                      {item.label}
                    </button>
                    {isChecked && (
                      <div className="px-4 pb-3">
                        <input
                          type="text"
                          value={products[productField]}
                          onChange={(e) => updateProduct(productField, e.target.value)}
                          placeholder={item.placeholder}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-400 font-medium"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 相片縮圖 */}
          {photoPreview && (
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="美容後紀錄預覽" className="w-full h-full object-cover" />
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
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 text-xs font-bold px-3 py-2 rounded-xl"
            >
              <CameraIcon />
              美容後紀錄
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
            disabled={saving}
            className={cn(
              'w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors',
              saving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#111111] text-white hover:bg-black',
            )}
          >
            {saving ? <Spinner /> : '完成紀錄'}
          </button>
        </div>
      </div>
    </div>
  )
}
