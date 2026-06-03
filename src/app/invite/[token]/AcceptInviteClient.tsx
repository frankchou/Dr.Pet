'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InviteInfo {
  petName: string
  petSpecies: string
  petBreed: string | null
  inviterName: string | null
  targetEmail: string
  status: string
  expiresAt: string
}

interface AcceptInviteClientProps {
  token: string
  inviteInfo: InviteInfo
  currentUserEmail: string
}

function PurePawLogoSmall() {
  return (
    <svg viewBox="0 0 512 512" width="40" height="40">
      <rect width="512" height="512" rx="115" fill="#FFE8D6" />
      <ellipse cx="175" cy="275" rx="25" ry="16" fill="#FCA5A5" opacity=".6" />
      <ellipse cx="337" cy="275" rx="25" ry="16" fill="#FCA5A5" opacity=".6" />
      <g transform="translate(100,110) scale(13)" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M21 14.5a6 6 0 01-6 6H9a6 6 0 01-6-6V9a6 6 0 016-6h6a6 6 0 016 6v5.5z" />
        <path d="M16 3l1 4 M8 3l-1 4" />
        <circle cx="9" cy="11" r="1.5" fill="#111" stroke="none" />
        <circle cx="15" cy="11" r="1.5" fill="#111" stroke="none" />
        <path d="M12 15c-1 0-1.5.5-1.5 1s.5 1 1.5 1 1.5-.5 1.5-1-.5-1-1.5-1z" fill="#111" stroke="none" />
      </g>
    </svg>
  )
}

export default function AcceptInviteClient({
  token,
  inviteInfo,
  currentUserEmail,
}: AcceptInviteClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailMismatch =
    currentUserEmail.toLowerCase() !== inviteInfo.targetEmail.toLowerCase()

  const handleAccept = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error)
        return
      }
      router.push('/')
    } catch {
      setError('發生錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const speciesLabel = inviteInfo.petSpecies === 'cat' ? '貓' : '狗'
  const breedLabel = inviteInfo.petBreed ? ` · ${inviteInfo.petBreed}` : ''

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center px-4">
      <div className="max-w-sm w-full mx-auto bg-white rounded-[32px] p-8 shadow-sm border-2 border-slate-900/5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <PurePawLogoSmall />
          <div>
            <div className="text-base font-bold text-[#111111] leading-tight">PurePaw</div>
            <div className="text-xs text-slate-400 leading-tight">無敏毛孩</div>
          </div>
        </div>

        {/* 邀請說明 */}
        <h1 className="text-xl font-bold text-[#111111] mb-2 leading-snug">
          {inviteInfo.inviterName ?? '有人'} 邀請你成為<br />
          <span className="text-[#D98A53]">{inviteInfo.petName}</span> 的共同飼主
        </h1>

        {/* 寵物資訊標籤 */}
        <div className="flex items-center gap-2 mt-3 mb-6">
          <span className="inline-flex items-center bg-[#FFE8D6] text-[#D98A53] text-xs font-bold px-3 py-1 rounded-full">
            {speciesLabel}{breedLabel}
          </span>
        </div>

        {/* Email 不符時顯示提示 */}
        {emailMismatch ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-sm text-amber-800 font-bold mb-1">帳號不符</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              此邀請是發給{' '}
              <span className="font-bold">{inviteInfo.targetEmail}</span>，
              請用該 Google 帳號登入後再開啟此連結。
            </p>
          </div>
        ) : null}

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 接受按鈕 */}
        {!emailMismatch && (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full bg-[#111111] text-white font-bold rounded-2xl py-4 text-sm hover:bg-black transition-colors shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                處理中...
              </>
            ) : (
              '接受邀請'
            )}
          </button>
        )}

        <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
          接受後你將可以共同管理 {inviteInfo.petName} 的健康資料
        </p>
      </div>
    </div>
  )
}
