'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import QRCode from 'qrcode'

// ─── 型別 ────────────────────────────────────────────────────────────────────

interface PetFormState {
  id: string
  name: string
  species: string
  breed: string
  sex: string
  birthday: string
  weight: string
  isNeutered: boolean
  avatar?: string | null
  /** 是否為已從 API 載入的既有寵物（false 表示前端暫存、尚未建立） */
  isNew?: boolean
}

interface RecordParam {
  id: string
  label: string
  enabled: boolean
}

const DEFAULT_RECORD_PARAMS: RecordParam[] = [
  { id: '1',  label: '日常飲食紀錄',     enabled: true  },
  { id: '2',  label: '用藥與看診',       enabled: true  },
  { id: '3',  label: '洗澡美容',         enabled: true  },
  { id: '4',  label: '體重追蹤',         enabled: false },
  { id: '5',  label: '飲水量',           enabled: false },
  { id: '6',  label: '活動量與散步',     enabled: true  },
  { id: '7',  label: '嘔吐 / 毛球',      enabled: true  },
  { id: '8',  label: '排泄狀況',         enabled: true  },
  { id: '9',  label: '睡眠品質',         enabled: true  },
  { id: '10', label: '換食計畫追蹤',     enabled: true  },
  { id: '11', label: '異常症狀',         enabled: true  },
  { id: '12', label: '備註與心情',       enabled: false },
  { id: '13', label: '我的標籤',         enabled: true  },
]

// ─── Inline SVG 圖示 ─────────────────────────────────────────────────────────

function SvgChevronLeft({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function SvgChevronRight({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function SvgCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function SvgInfo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={18} height={18} className="text-slate-400">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function SvgWeight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={18} height={18} className="text-slate-400">
      <path d="M6 2h12l2 7H4z" />
      <path d="M4 9l2 12h12l2-12" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  )
}

function SvgPawPrint() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" /><circle cx="4" cy="8" r="2" />
      <path d="M10.34 15.84c-.47-.10-1.52-.06-2.34.58-.82.64-1 1.58-.72 2.34.28.76 1.09 1.30 2.04 1.38.95.08 1.53-.38 2.11-1.14.58-.76.64-1.56.34-2.16s-.96-.94-1.43-1z" />
    </svg>
  )
}

function SvgCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function SvgHash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  )
}

function SvgPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" width={32} height={32}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SvgMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#111111] text-white rounded-full px-4 py-2 text-sm font-bold shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 whitespace-nowrap">
      {message}
    </div>
  )
}

// ─── 共同飼主區塊 ────────────────────────────────────────────────────────────

interface PetMemberInfo {
  id: string
  userId: string
  role: string
  joinedAt: string
  user: { name: string | null; email: string | null; image: string | null }
}

interface InvitationInfo {
  id: string
  token: string
  targetEmail: string
  status: string
  createdAt: string
}

function CoOwnerSection({ petId }: { petId: string }) {
  const [members, setMembers] = useState<PetMemberInfo[]>([])
  const [invitations, setInvitations] = useState<InvitationInfo[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrInviteUrl, setQrInviteUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const loadData = useCallback(async () => {
    try {
      // 並行取成員和邀請
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/pets/${petId}/members`),
        fetch(`/api/pets/${petId}/invitations`),
      ])
      if (membersRes.ok) setMembers(await membersRes.json() as PetMemberInfo[])
      if (invitesRes.ok) setInvitations(await invitesRes.json() as InvitationInfo[])
    } catch { /* 靜默忽略 */ }
  }, [petId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleInvite = async () => {
    if (!emailInput.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/pets/${petId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      })
      const data = await res.json() as { inviteUrl?: string; error?: string }
      if (!res.ok) {
        showToast(data.error ?? '邀請失敗')
        return
      }
      setEmailInput('')
      showToast('邀請已送出')
      await loadData()
      // 自動顯示 QR Code
      if (data.inviteUrl) {
        const url = await QRCode.toDataURL(data.inviteUrl, { width: 200, margin: 1 })
        setQrDataUrl(url)
        setQrInviteUrl(data.inviteUrl)
      }
    } catch {
      showToast('邀請失敗，請再試一次')
    } finally {
      setSending(false)
    }
  }

  const handleShowQr = async (inviteToken: string) => {
    const url = `${window.location.origin}/invite/${inviteToken}`
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 })
    setQrDataUrl(dataUrl)
    setQrInviteUrl(url)
  }

  const pendingInvites = invitations.filter(inv => inv.status === 'pending')
  const coOwners = members.filter(m => m.role === 'co_owner')

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
        {/* 人員圖示 */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={18} height={18} className="text-slate-400">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <h3 className="font-bold text-slate-800 text-sm">共同飼主</h3>
      </div>

      {/* 已有共同飼主列表 */}
      {coOwners.length > 0 && (
        <div className="mb-4 space-y-2">
          {coOwners.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-[#FFE8D6] flex items-center justify-center text-xs font-bold text-[#D98A53] overflow-hidden shrink-0">
                {m.user.image ? (
                  <img src={m.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  (m.user.name?.charAt(0) ?? m.user.email?.charAt(0) ?? '?').toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{m.user.name ?? m.user.email}</p>
                <p className="text-xs text-slate-400 truncate">{m.user.email}</p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">共同飼主</span>
            </div>
          ))}
        </div>
      )}

      {/* 待接受邀請 */}
      {pendingInvites.length > 0 && (
        <div className="mb-4 space-y-2">
          {pendingInvites.map(inv => (
            <div key={inv.id} className="flex items-center gap-3 py-2 opacity-60">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700 truncate">{inv.targetEmail}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-full">待接受</span>
                <button
                  onClick={() => handleShowQr(inv.token)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                  title="顯示 QR Code"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="3" height="3" /><rect x="18" y="14" width="3" height="3" />
                    <rect x="14" y="18" width="3" height="3" /><rect x="18" y="18" width="3" height="3" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 邀請輸入區 */}
      <div className="flex gap-2">
        <input
          type="email"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
          placeholder="輸入 Google 帳號 email"
          className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#111111]/10 focus:outline-none transition-all"
        />
        <button
          onClick={handleInvite}
          disabled={sending || !emailInput.trim()}
          className="px-4 py-3 bg-[#111111] text-white text-sm font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            '邀請'
          )}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <p className="mt-2 text-xs font-bold text-center text-[#D98A53]">{toast}</p>
      )}

      {/* QR Code Modal */}
      {qrDataUrl && qrInviteUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setQrDataUrl(null); setQrInviteUrl(null) }}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-xs w-full mx-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#111111] text-center mb-4">掃描加入共同飼主</h3>
            <div className="flex justify-center mb-4">
              <img src={qrDataUrl} alt="QR Code" className="w-[200px] h-[200px]" />
            </div>
            <p className="text-xs text-slate-400 text-center break-all leading-relaxed mb-4">{qrInviteUrl}</p>
            <button
              onClick={() => { setQrDataUrl(null); setQrInviteUrl(null) }}
              className="w-full py-3 bg-[#111111] text-white font-bold rounded-2xl text-sm hover:bg-black transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 單張 Pet 卡片 ───────────────────────────────────────────────────────────

interface PetCardProps {
  pet: PetFormState
  onUpdate: (field: keyof PetFormState, value: string | boolean) => void
  onSave: () => void
  saving: boolean
}

function PetCard({ pet, onUpdate, onSave, saving }: PetCardProps) {
  const inputCls =
    'w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#111111]/10 focus:outline-none transition-all'

  return (
    <div data-pet-card className="w-[calc(100vw-3rem)] md:w-[600px] shrink-0">
      {/* 頭像 */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-sm bg-[#F5F1E8] flex items-center justify-center">
            {pet.avatar ? (
              <Image
                src={pet.avatar}
                alt={pet.name}
                width={128}
                height={128}
                className="w-full h-full object-cover object-top"
                unoptimized
              />
            ) : (
              <span className="text-[#D98A53] text-4xl font-bold">
                {pet.name.charAt(0) || '?'}
              </span>
            )}
          </div>
          {/* 上傳頭像暫時 disabled（TODO: 實作檔案上傳） */}
          <button
            disabled
            className="absolute bottom-0 right-0 w-10 h-10 bg-[#111111] text-white rounded-full flex items-center justify-center border-4 border-[#F4F7FB] shadow-sm opacity-40 cursor-not-allowed"
            title="頭像上傳即將推出"
          >
            <SvgCamera />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* 基本資訊 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
            <SvgInfo />
            <h3 className="font-bold text-slate-800 text-sm">基本資訊</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">名字</label>
              <input
                type="text"
                value={pet.name}
                onChange={e => onUpdate('name', e.target.value)}
                className={inputCls}
                placeholder="毛孩的名字"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">品種</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <SvgPawPrint />
                  </div>
                  <input
                    type="text"
                    value={pet.breed}
                    onChange={e => onUpdate('breed', e.target.value)}
                    className={inputCls + ' pl-10'}
                    placeholder="品種"
                  />
                </div>
              </div>
              <div className="w-[130px]">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">性別</label>
                <select
                  value={`${pet.sex}${pet.isNeutered ? '_neutered' : ''}`}
                  onChange={e => {
                    const val = e.target.value
                    if (val === 'male_neutered') { onUpdate('sex', 'male'); onUpdate('isNeutered', true) }
                    else if (val === 'female_neutered') { onUpdate('sex', 'female'); onUpdate('isNeutered', true) }
                    else { onUpdate('sex', val); onUpdate('isNeutered', false) }
                  }}
                  className={inputCls + ' appearance-none'}
                >
                  <option value="male">公</option>
                  <option value="female">母</option>
                  <option value="male_neutered">公 (已結紮)</option>
                  <option value="female_neutered">母 (已結紮)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 生理與晶片 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
            <SvgWeight />
            <h3 className="font-bold text-slate-800 text-sm">生理資訊</h3>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">生日</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <SvgCalendar />
                  </div>
                  <input
                    type="date"
                    value={pet.birthday}
                    onChange={e => onUpdate('birthday', e.target.value)}
                    className={inputCls + ' pl-10'}
                  />
                </div>
              </div>
              <div className="w-[120px]">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">體重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={pet.weight}
                  onChange={e => onUpdate('weight', e.target.value)}
                  className={inputCls}
                  placeholder="0.0"
                />
              </div>
            </div>
            {/* 晶片號碼 — schema 目前無此欄位，僅顯示 disabled 提示 */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">
                晶片號碼
                <span className="ml-1 text-[10px] text-slate-300">(功能開發中)</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <SvgHash />
                </div>
                <input
                  type="text"
                  disabled
                  placeholder="輸入 15 碼晶片編號"
                  className={inputCls + ' pl-10 opacity-40 cursor-not-allowed'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 儲存按鈕 */}
        <div className="pt-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full bg-[#111111] text-white font-bold rounded-2xl py-4 hover:bg-black transition-colors shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                儲存中...
              </>
            ) : (
              '儲存檔案'
            )}
          </button>
        </div>

        {/* 共同飼主管理（已儲存的 pet 才顯示） */}
        {!pet.isNew && <CoOwnerSection petId={pet.id} />}
      </div>
    </div>
  )
}

// ─── 主頁面 ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<'profile' | 'params'>('profile')
  const [pets, setPets] = useState<PetFormState[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [recordParams, setRecordParams] = useState<RecordParam[]>(() => {
    // 初始值延遲讀取（避免 SSR 問題，useEffect 中覆蓋）
    return DEFAULT_RECORD_PARAMS
  })

  const carouselRef = useRef<HTMLDivElement>(null)

  // 載入 localStorage 紀錄參數
  useEffect(() => {
    try {
      const stored = localStorage.getItem('purepaw_record_params')
      if (stored) setRecordParams(JSON.parse(stored) as RecordParam[])
    } catch { /* 若解析失敗使用預設值 */ }
  }, [])

  // 載入寵物列表
  useEffect(() => {
    fetch('/api/pets')
      .then(r => r.json())
      .then((data: {
        id: string; name: string; species: string; breed?: string | null;
        sex: string; birthday?: string | null; weight?: number | null;
        isNeutered: boolean; avatar?: string | null;
      }[]) => {
        setPets(
          data.map(p => ({
            id: p.id,
            name: p.name,
            species: p.species,
            breed: p.breed ?? '',
            sex: p.sex,
            birthday: p.birthday ? p.birthday.slice(0, 10) : '',
            weight: p.weight != null ? String(p.weight) : '',
            isNeutered: p.isNeutered,
            avatar: p.avatar,
          }))
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const updatePet = (id: string, field: keyof PetFormState, value: string | boolean) => {
    setPets(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const savePet = async (pet: PetFormState) => {
    setSavingId(pet.id)
    try {
      const body = {
        name: pet.name,
        species: pet.species || 'dog',
        breed: pet.breed || null,
        sex: pet.sex,
        birthday: pet.birthday || null,
        weight: pet.weight ? parseFloat(pet.weight) : null,
        isNeutered: pet.isNeutered,
      }

      if (pet.isNew) {
        // 建立新寵物
        const res = await fetch('/api/pets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('建立失敗')
        const created = await res.json() as { id: string }
        setPets(prev => prev.map(p => p.id === pet.id ? { ...p, id: created.id, isNew: false } : p))
        showToast('已建立毛孩檔案')
      } else {
        // 更新既有寵物
        const res = await fetch(`/api/pets/${pet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('儲存失敗')
        showToast('已儲存')
      }
    } catch {
      showToast('儲存失敗，請再試一次')
    } finally {
      setSavingId(null)
    }
  }

  const addNewPet = () => {
    const tempId = `new_${Date.now()}`
    const newPet: PetFormState = {
      id: tempId,
      name: '新毛孩',
      species: 'dog',
      breed: '',
      sex: 'male',
      birthday: '',
      weight: '',
      isNeutered: false,
      isNew: true,
    }
    setPets(prev => [...prev, newPet])
    // 滾動到最後一張（新增卡片前一張）
    setTimeout(() => {
      const el = carouselRef.current
      if (!el) return
      el.scrollLeft = el.scrollWidth
    }, 100)
  }

  const scrollPets = (dir: -1 | 1) => {
    const el = carouselRef.current
    if (!el) return
    const card = el.querySelector('[data-pet-card]') as HTMLElement | null
    const stride = card ? card.offsetWidth + 24 : 624
    const max = el.scrollWidth - el.clientWidth
    el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + dir * stride))
  }

  const toggleParam = (id: string) => {
    setRecordParams(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
      try { localStorage.setItem('purepaw_record_params', JSON.stringify(updated)) } catch { /* 忽略 */ }
      return updated
    })
  }

  return (
    <div
      className="px-6 md:px-8 py-6 min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full"
      style={{ fontFamily: 'var(--pp-font)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-center mb-6 relative">
        <Link
          href="/"
          className="absolute left-0 w-10 h-10 flex items-center justify-start text-slate-700"
        >
          <SvgChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">設定與檔案</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-full mb-8">
        <button
          onClick={() => setTab('profile')}
          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${
            tab === 'profile' ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black'
          }`}
        >
          毛孩檔案
        </button>
        <button
          onClick={() => setTab('params')}
          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${
            tab === 'params' ? 'bg-[#111111] shadow-sm text-white' : 'text-slate-500 hover:text-black'
          }`}
        >
          紀錄參數設定
        </button>
      </div>

      {/* Tab 1: 毛孩檔案 */}
      {tab === 'profile' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* 桌面版左右切換提示 */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => scrollPets(-1)}
                  className="hidden md:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
                >
                  <SvgChevronLeft size={18} />
                </button>
                <p className="text-sm font-bold text-slate-500 text-center">
                  <span className="md:hidden">左右滑動以切換毛孩</span>
                  <span className="hidden md:inline">切換毛孩檔案</span>
                </p>
                <button
                  onClick={() => scrollPets(1)}
                  className="hidden md:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
                >
                  <SvgChevronRight size={18} />
                </button>
              </div>

              {/* 水平可滾動卡片 */}
              <div
                ref={carouselRef}
                className="flex overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8 pb-8 gap-6 hide-scrollbar"
              >
                {pets.map(pet => (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    onUpdate={(field, value) => updatePet(pet.id, field, value)}
                    onSave={() => savePet(pet)}
                    saving={savingId === pet.id}
                  />
                ))}

                {/* 新增毛孩卡片 */}
                <div className="w-[calc(100vw-3rem)] md:w-[600px] shrink-0 flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <button
                    onClick={addNewPet}
                    className="flex flex-col items-center gap-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                      <SvgPlus />
                    </div>
                    <span className="font-bold">新增毛孩檔案</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: 紀錄參數設定 */}
      {tab === 'params' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-6">
            <p className="text-sm font-bold text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              點選以隱藏或顯示以下項目。<br />
              按下並拖曳項目以調整日誌表單中的順序。
            </p>
          </div>
          <div className="flex-1 bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            {recordParams.map((param, i) => (
              <div
                key={param.id}
                className={`flex items-center justify-between p-4 ${
                  i !== recordParams.length - 1 ? 'border-b border-slate-50' : ''
                }`}
              >
                <span className="text-sm font-bold text-slate-800">{param.label}</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleParam(param.id)}
                    className={`w-[48px] h-7 rounded-full relative transition-colors duration-300 ${
                      param.enabled ? 'bg-[#111111]' : 'bg-slate-200'
                    }`}
                    aria-label={param.enabled ? '關閉' : '開啟'}
                  >
                    <div
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                        param.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div className="text-slate-300 cursor-grab hover:text-slate-500 transition-colors">
                    <SvgMenu />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast 通知 */}
      {toast && <Toast message={toast} />}
    </div>
  )
}
