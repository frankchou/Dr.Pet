'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'

/* ─── 免責聲明條款 ────────────────────────────────────────────── */
type DisclaimerClause = { title: string; body: string; bold?: boolean }

const DISCLAIMER_CLAUSES: DisclaimerClause[] = [
  {
    title: '服務性質',
    body: '本服務所提供之寵物營養分析、成分判讀、換食與補充建議，均由 AI 系統根據您提供的資料自動生成，屬於資訊整理與衛教參考。',
  },
  {
    title: '非醫療診斷',
    body: '本服務不構成、也無法取代專業獸醫師的醫療診斷、治療或處方。任何健康疑慮、疾病處置與用藥決定，均應以您的獸醫師臨床判斷為準。',
    bold: true,
  },
  {
    title: '資訊正確性',
    body: 'AI 分析結果可能因資料不完整、產品標示差異或模型限制而有誤差。本服務不保證所有資訊之即時性、完整性與正確性，內容僅供參考。',
  },
  {
    title: '個人化限制',
    body: '每隻毛孩的年齡、品種、病史與體質皆不同。系統提供之建議為一般性參考，實際餵食份量、保健品與處方請務必與獸醫師討論後再行調整。',
  },
  {
    title: '緊急狀況',
    body: '若您的毛孩出現嘔吐、拒食、呼吸困難、中毒或其他急性症狀，請立即就醫，切勿僅依賴本服務之建議延誤治療。',
  },
  {
    title: '資料與隱私',
    body: '您所輸入的毛孩資料僅用於產生分析結果與改善服務體驗，我們將依個資相關法規妥善保管。',
  },
  {
    title: '同意條款',
    body: '點選「我已閱讀並同意」即表示您已充分理解上述內容，並同意在知悉前述限制的前提下使用本服務。',
  },
]

/* ─── DisclaimerModal ────────────────────────────────────────── */
function DisclaimerModal({ onAgree }: { onAgree: () => void }) {
  const [canAgree, setCanAgree] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 若內容本身就很短，直接允許同意
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.clientHeight < 16) {
      setCanAgree(true)
    }
  }, [])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop
    if (distanceFromBottom < 16) setCanAgree(true)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full md:max-w-lg bg-white rounded-t-[32px] md:rounded-[32px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* 頂部標題 */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0 flex items-center gap-3">
          <PurePawLogo />
          <div>
            <h2 className="text-lg font-bold text-[#111111]">使用前重要聲明</h2>
            <p className="text-xs font-bold text-slate-400">請詳閱以下內容並滑動至最下方</p>
          </div>
        </div>

        {/* 可滾動條款區 */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {DISCLAIMER_CLAUSES.map((clause, idx) => (
            <div key={idx}>
              <h3 className="font-bold text-[#111111] mb-1 flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-[#FFE8D6] text-[#D98A53] text-[11px] flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                {clause.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed pl-7">
                {idx === 1 ? (
                  <>
                    <span className="font-bold text-[#111111]">本服務不構成、也無法取代專業獸醫師的醫療診斷、治療或處方。</span>
                    任何健康疑慮、疾病處置與用藥決定，均應以您的獸醫師臨床判斷為準。
                  </>
                ) : clause.body}
              </p>
            </div>
          ))}
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100 leading-relaxed pl-7">
            資料參考來源：世界動物衛生組織、世界獸醫協會、WSAVA、AAFCO、FEDIAF、NRC、農業部動植物防疫檢疫署、台灣小動物獸醫學會、國立臺灣大學獸醫專業學院等。
          </p>
          <div className="h-2" />
        </div>

        {/* 按鈕區 */}
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          {!canAgree && (
            <p className="text-[11px] font-bold text-slate-400 text-center mb-2 flex items-center justify-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={13} height={13}><polyline points="6 9 12 15 18 9" /></svg>
              請滑動閱讀至最下方以繼續
            </p>
          )}
          <button
            onClick={canAgree ? onAgree : undefined}
            disabled={!canAgree}
            className={`w-full py-4 rounded-2xl text-sm font-bold transition-all ${
              canAgree
                ? 'bg-[#111111] text-white hover:bg-black shadow-lg shadow-black/10 cursor-pointer'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            我已閱讀並同意
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── 手繪毛孩 SVG ────────────────────────────────────────────── */
function HandDrawnGraphic() {
  return (
    <svg viewBox="0 0 200 200" className="w-[260px] h-[260px] md:w-[360px] md:h-[360px] max-w-full drop-shadow-sm">
      <circle cx="100" cy="100" r="75" fill="#FFFFFF" />
      <path d="M70,140 Q40,110 60,70 Q80,30 130,50 Q170,70 160,120 Q150,170 100,160 Q80,155 70,140" fill="#F4F7FB" />
      <circle cx="140" cy="55" r="24" fill="#FCA5A5" opacity="0.6" />
      <circle cx="55" cy="135" r="18" fill="#FDE047" opacity="0.8" />
      <circle cx="165" cy="140" r="12" fill="#7C9CE3" opacity="0.7" />
      <g fill="none" stroke="#111111" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M65,75 C60,45 85,55 90,65" />
        <path d="M135,75 C140,45 115,55 110,65" />
        <path d="M65,75 Q45,115 75,135 Q100,145 125,135 Q155,115 135,75 Q100,65 65,75" />
        <path d="M85,100 Q90,95 95,100" />
        <path d="M115,100 Q110,95 105,100" />
        <path d="M100,115 L98,112 L102,112 Z" fill="#111111" />
        <path d="M100,115 Q100,122 93,125" />
        <path d="M100,115 Q100,122 107,125" />
        <path d="M80,150 L120,150 L115,165 L85,165 Z" fill="#FFFFFF" />
        <path d="M100,150 L100,158" />
      </g>
      <g fill="none" stroke="#111111" strokeWidth="2.5" strokeLinecap="round">
        <path d="M30,45 L40,45 M35,40 L35,50" />
        <path d="M170,100 L180,100 M175,95 L175,105" />
        <path d="M45,170 L50,170 M47.5,167.5 L47.5,172.5" />
      </g>
    </svg>
  )
}

/* ─── PurePaw Logo SVG ────────────────────────────────────────── */
function PurePawLogo() {
  return (
    <svg viewBox="0 0 512 512" width="48" height="48">
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
      <path d="M380 120 Q390 140 410 150 Q390 160 380 180 Q370 160 350 150 Q370 140 380 120" fill="#FDE047" />
    </svg>
  )
}

/* ─── 測試帳號登入表單 ────────────────────────────────────────── */
function DemoCredentialsForm() {
  const [email, setEmail] = useState('demo@drpet.com')
  const [password, setPassword] = useState('demo1234')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/',
      redirect: false,
    })

    if (result?.error) {
      setError('帳號或密碼錯誤，請再試一次')
      setLoading(false)
    } else if (result?.url) {
      window.location.href = result.url
    }
  }

  return (
    <div className="mt-5">
      {/* 分隔線 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-black/10" />
        <span className="text-xs font-medium text-slate-400">或</span>
        <div className="flex-1 h-px bg-black/10" />
      </div>

      <p className="text-xs text-slate-400 text-center mb-3">開發測試帳號</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密碼"
          required
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 transition-colors"
        />

        {error && (
          <p className="text-xs text-red-500 font-medium text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border-2 border-black/15 bg-transparent px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-black/30 hover:text-slate-800 transition-colors disabled:opacity-50"
        >
          {loading ? '登入中…' : '以測試帳號登入'}
        </button>
      </form>
    </div>
  )
}

/* ─── Login 頁面 ──────────────────────────────────────────────── */
function LoginPage() {
  const handleGoogleLogin = () => {
    signIn('google')
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col md:flex-row">
      {/* 左側插圖區（手機版在上方，桌面版在左側） */}
      <div className="md:w-5/12 bg-[#FFE8D6] flex flex-col items-center justify-center px-8 py-10 gap-6">
        <HandDrawnGraphic />
        {/* 桌面版才顯示的文字 */}
        <div className="hidden md:block text-center">
          <h2 className="text-2xl font-bold text-[#111111] leading-snug mb-3">
            專屬台灣毛孩的<br />AI 健康管理神器
          </h2>
          <ul className="text-sm text-[#64748B] space-y-2 text-left max-w-[240px] mx-auto">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D98A53] flex-shrink-0" />
              即時掃描食品成分，判讀安全風險
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D98A53] flex-shrink-0" />
              AI 營養師個人化飲食建議
            </li>
          </ul>
        </div>
      </div>

      {/* 右側登入區 */}
      <div className="flex-1 md:w-7/12 bg-white rounded-t-[40px] md:rounded-none md:rounded-l-[40px] flex flex-col items-center justify-center px-8 py-12 -mt-8 md:mt-0">
        {/* Logo + 品牌名 */}
        <div className="flex items-center gap-3 mb-8">
          <PurePawLogo />
          <div>
            <div className="text-2xl font-bold text-[#111111] leading-tight">PurePaw</div>
            <div className="text-sm text-slate-400 leading-tight">無敏毛孩</div>
          </div>
        </div>

        <div className="w-full max-w-[320px]">
          <h1 className="text-2xl font-bold text-[#111111] mb-2">歡迎回來 ✨</h1>
          <p className="text-sm text-slate-500 mb-8">登入以存取您的毛孩健康資料</p>

          {/* Google 登入按鈕 */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 rounded-2xl py-4 hover:bg-slate-50 transition-colors shadow-sm"
          >
            {/* Google 彩色 Logo */}
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-sm font-semibold text-[#111111]">使用 Google 繼續</span>
          </button>

          {/* 測試帳號入口（只在 NEXT_PUBLIC_DEMO_ENABLED=true 時顯示） */}
          {process.env.NEXT_PUBLIC_DEMO_ENABLED === 'true' && (
            <DemoCredentialsForm />
          )}

          <p className="text-[11px] text-slate-400 text-center mt-6 leading-relaxed">
            繼續即代表您同意我們的服務條款與隱私權政策
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── ClientShell（主體）─────────────────────────────────────── */
const PUBLIC_PATHS = ['/landing', '/invite']

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [isPublicPath, setIsPublicPath] = useState(false)

  useEffect(() => {
    const path = window.location.pathname
    const pub = PUBLIC_PATHS.some(p => path.startsWith(p))
    setIsPublicPath(pub)
  }, [])

  // 登入成功後同步 userId 到 localStorage（相容舊邏輯）
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      localStorage.setItem('drpet_userId', session.user.id)
      localStorage.setItem('drpet_nickname', session.user.name ?? '飼主')

      // 首次登入後若尚未同意免責聲明，顯示彈窗
      const disclaimerAck = localStorage.getItem('purepaw_disclaimer_ack_v1')
      if (!disclaimerAck && !isPublicPath) setShowDisclaimer(true)
    }
  }, [status, session, isPublicPath])

  const handleAgree = () => {
    localStorage.setItem('purepaw_disclaimer_ack_v1', '1')
    setShowDisclaimer(false)
  }

  // 等待 session 狀態確定
  if (status === 'loading') return null
  if (isPublicPath) return <>{children}</>
  if (status === 'unauthenticated') return <LoginPage />

  return (
    <>
      {children}
      {showDisclaimer && <DisclaimerModal onAgree={handleAgree} />}
    </>
  )
}
