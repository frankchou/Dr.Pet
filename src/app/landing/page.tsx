import type { Metadata } from 'next'
import Link from 'next/link'
import '../globals.css'

export const metadata: Metadata = {
  title: 'PurePaw 無敏毛孩｜台灣毛孩專屬的 AI 寵物營養與成分分析平台',
  description:
    'PurePaw 無敏毛孩是專為台灣飼主打造的 AI 寵物營養健康管理平台。拍照即時分析飼料成分、判讀過敏與風險、提供換食計畫與 24 小時 AI 營養師諮詢，協助毛孩吃得更安心。',
  keywords:
    '寵物營養分析, 飼料成分分析, AI 營養師, 寵物換食計畫, 狗飼料推薦, 貓飼料成分, 毛孩健康管理, PurePaw, 無敏毛孩',
  openGraph: {
    type: 'website',
    title: 'PurePaw 無敏毛孩｜AI 寵物營養與成分分析平台',
    description: '拍照即時分析飼料成分、判讀過敏風險、AI 營養師諮詢與換食計畫，台灣毛孩專屬的健康管理平台。',
    locale: 'zh_TW',
  },
}

// 六大功能資料
const FEATURES = [
  {
    icon: 'bone',
    bg: '#FEF1E2',
    title: '成分即時分析',
    desc: '拍下成分標籤，AI 立即辨識成分、標示適合 / 需注意 / 不建議，並列出有益與風險成分。',
  },
  {
    icon: 'steth',
    bg: '#E2F3E4',
    title: 'AI 營養師',
    desc: '24 小時對話諮詢，依毛孩檔案給出飲食建議，並可生成每週健康觀察計畫。',
  },
  {
    icon: 'book',
    bg: '#FDE2EC',
    title: '健康日誌',
    desc: '記錄飲食、用藥、美容與症狀，AI 隨記可語音輸入並自動標記異常。',
  },
  {
    icon: 'swap',
    bg: '#FEF1E2',
    title: '換食計畫',
    desc: '追蹤換食天數，依風險成分推薦替代產品與漸進式換糧建議。',
  },
  {
    icon: 'cal',
    bg: '#EAF5ED',
    title: '健康日程',
    desc: '疫苗、驅蟲、美容與生日倒數提醒，重要日程不再錯過。',
  },
  {
    icon: 'chart',
    bg: '#EDF3FB',
    title: '營養綜合分析',
    desc: '合計所有產品的營養素，比對建議範圍，整體評估飲食風險。',
  },
] as const

// FAQ 資料
const FAQ_ITEMS = [
  {
    q: 'PurePaw 無敏毛孩是什麼？',
    a: 'PurePaw 是專為台灣飼主設計的 AI 寵物營養健康管理平台。飼主可以拍照分析飼料與保健品成分、記錄毛孩日常健康、追蹤換食計畫，並透過 AI 營養師獲得飲食建議。',
  },
  {
    q: 'PurePaw 如何分析飼料成分？',
    a: '使用「即時分析」功能拍攝產品成分標籤，AI 會自動辨識成分、比對台灣與國際營養標準（如 AAFCO、FEDIAF），標示適合、需注意或不建議，並列出有益與需留意的成分。',
  },
  {
    q: 'PurePaw 可以取代獸醫嗎？',
    a: '不行。PurePaw 提供的是資訊整理與營養參考，不具醫療診斷效力，無法取代專業獸醫師的診斷與處置。緊急狀況請立即就醫。',
  },
  {
    q: 'PurePaw 支援貓咪和狗狗嗎？',
    a: '支援。PurePaw 可同時管理多隻毛孩檔案，並依照犬貓的品種、年齡、體重與健康狀況提供個人化的營養參考。',
  },
  {
    q: 'PurePaw 需要付費嗎？',
    a: 'PurePaw 提供免費的核心功能，包含成分分析、健康日誌與基本 AI 諮詢，使用 Google 帳號即可快速登入開始使用。',
  },
  {
    q: '換食計畫功能怎麼運作？',
    a: '啟動換食計畫後，PurePaw 會追蹤換食天數，並根據毛孩的風險成分推薦具體的替代產品與漸進式換糧建議，協助減少腸胃不適。',
  },
]

// 功能圖示 SVG 路徑
const ICON_PATHS: Record<string, string> = {
  bone: '<path d="M17 10c.7-.7 1.4-1 2-1a3 3 0 010 6c-.6 0-1.3-.3-2-1v0c-.7.7-1.4 1-2 1a3 3 0 010-6c.6 0 1.3.3 2 1z"/><path d="M7 10c-.7-.7-1.4-1-2-1a3 3 0 000 6c.6 0 1.3-.3 2-1v0c.7.7 1.4 1 2 1a3 3 0 000-6c-.6 0-1.3.3-2 1z"/><path d="M7 12h10"/>',
  steth:
    '<path d="M4 3v4c0 4.4 3.6 8 8 8s8-3.6 8-8V3"/><path d="M12 15v6 M9 21h6"/><circle cx="2" cy="3" r="2" fill="currentColor" stroke="none"/><circle cx="22" cy="3" r="2" fill="currentColor" stroke="none"/>',
  book: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="4" x2="8" y2="22"/>',
  swap: '<path d="M3 7h13l-3-3 M21 17H8l3 3"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  chart:
    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
}

// JSON-LD structured data
const WEB_APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'PurePaw 無敏毛孩',
  alternateName: 'PurePaw',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, iOS, Android',
  inLanguage: 'zh-TW',
  description:
    '專為台灣飼主打造的 AI 寵物營養健康管理平台，提供飼料成分即時分析、過敏與營養風險判讀、換食計畫追蹤與 AI 營養師諮詢。',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' },
  featureList: [
    '飼料成分即時拍照分析',
    'AI 營養師對話諮詢',
    '毛孩健康日誌與症狀追蹤',
    '換食計畫與替代產品推薦',
    '疫苗與驅蟲日程提醒',
  ],
}

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

export default function LandingPage() {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEB_APP_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
        />
        <style>{`
          body {
            font-family: 'Quicksand', 'Noto Sans TC', sans-serif;
            background: #FFFDFB;
            color: #111;
            -webkit-font-smoothing: antialiased;
          }
          details > summary { list-style: none; cursor: pointer; }
          details > summary::-webkit-details-marker { display: none; }
          details[open] .chev { transform: rotate(180deg); }
          .chev { transition: transform 0.2s; }
          @keyframes scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .marquee { display: flex; white-space: nowrap; animation: scroll 28s linear infinite; }
        `}</style>
      </head>
      <body id="top">
        {/* ── Nav ── */}
        <header className="sticky top-0 z-40 bg-[#FFFDFB]/85 backdrop-blur-md border-b border-black/5">
          <div className="max-w-6xl mx-auto px-5 md:px-6 py-3.5 flex items-center justify-between">
            <a href="#top" className="flex items-center gap-2.5">
              <svg viewBox="0 0 512 512" width="38" height="38">
                <rect width="512" height="512" rx="115" fill="#FFE8D6" />
                <ellipse cx="175" cy="275" rx="25" ry="16" fill="#FCA5A5" opacity=".6" />
                <ellipse cx="337" cy="275" rx="25" ry="16" fill="#FCA5A5" opacity=".6" />
                <g
                  transform="translate(100,110) scale(13)"
                  stroke="#111"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  <path d="M21 14.5a6 6 0 01-6 6H9a6 6 0 01-6-6V9a6 6 0 016-6h6a6 6 0 016 6v5.5z" />
                  <path d="M16 3l1 4 M8 3l-1 4" />
                  <circle cx="9" cy="11" r="1.5" fill="#111" stroke="none" />
                  <circle cx="15" cy="11" r="1.5" fill="#111" stroke="none" />
                  <path
                    d="M12 15c-1 0-1.5.5-1.5 1s.5 1 1.5 1 1.5-.5 1.5-1-.5-1-1.5-1z"
                    fill="#111"
                    stroke="none"
                  />
                </g>
                <path
                  d="M380 120 Q390 140 410 150 Q390 160 380 180 Q370 160 350 150 Q370 140 380 120"
                  fill="#FDE047"
                />
              </svg>
              <div className="leading-tight">
                <div className="font-bold text-lg tracking-tight">PurePaw</div>
                <div className="text-[10px] font-bold tracking-[0.2em] text-slate-500">無敏毛孩</div>
              </div>
            </a>
            <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
              <a href="#features" className="hover:text-black transition-colors">功能</a>
              <a href="#how" className="hover:text-black transition-colors">運作方式</a>
              <a href="#faq" className="hover:text-black transition-colors">常見問題</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm font-bold text-slate-700 hover:text-black transition-colors">
                登入
              </Link>
              <Link
                href="/"
                className="bg-[#111] text-white text-sm font-bold rounded-full px-5 py-2.5 hover:bg-black transition-colors"
              >
                免費開始
              </Link>
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="relative bg-[#FFE8D6] overflow-hidden">
          <div className="max-w-6xl mx-auto px-5 md:px-6 pt-14 md:pt-20 pb-0 grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-7 pb-14 md:pb-24">
              <span className="inline-flex items-center gap-1.5 bg-[#111] text-white text-xs font-bold px-3.5 py-1.5 rounded-full mb-6">
                台灣毛孩專屬 · AI 營養平台
              </span>
              <h1 className="font-bold tracking-tight leading-[0.95] text-[15vw] md:text-[7rem]">
                看懂
                <br />
                <span style={{ WebkitTextStroke: '2px #111111', color: 'transparent' }}>每一口</span>
              </h1>
              <p className="text-lg md:text-xl font-bold text-[#3A332C] leading-relaxed mt-6 max-w-md">
                拍照，就知道這碗飼料適不適合你的毛孩。成分判讀、過敏風險、換食計畫，AI 一次搞定。
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link
                  href="/"
                  className="bg-[#111] text-white font-bold rounded-2xl px-8 py-4 text-lg hover:bg-black transition-colors shadow-xl shadow-black/15"
                >
                  免費開始使用 →
                </Link>
                <a
                  href="#how"
                  className="bg-white/60 backdrop-blur text-[#3A332C] font-bold rounded-2xl px-8 py-4 text-lg hover:bg-white transition-colors border border-white/60"
                >
                  怎麼運作？
                </a>
              </div>
            </div>
            <div className="md:col-span-5 flex justify-center md:justify-end">
              <svg viewBox="0 0 200 220" className="w-[78%] max-w-[360px] drop-shadow-sm">
                <circle cx="100" cy="100" r="78" fill="#fff" />
                <circle cx="150" cy="48" r="26" fill="#FCA5A5" opacity=".55" />
                <circle cx="46" cy="140" r="20" fill="#FDE047" opacity=".85" />
                <circle cx="168" cy="150" r="13" fill="#7C9CE3" opacity=".7" />
                <g
                  fill="none"
                  stroke="#111"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M65,75 C60,45 85,55 90,65" />
                  <path d="M135,75 C140,45 115,55 110,65" />
                  <path d="M65,75 Q45,115 75,135 Q100,145 125,135 Q155,115 135,75 Q100,65 65,75" />
                  <path d="M85,100 Q90,95 95,100" />
                  <path d="M115,100 Q110,95 105,100" />
                  <path d="M100,115 L98,112 L102,112 Z" fill="#111" />
                  <path d="M100,115 Q100,122 93,125" />
                  <path d="M100,115 Q100,122 107,125" />
                  <path d="M78,152 L122,152 L116,170 L84,170 Z" fill="#fff" />
                  <path d="M100,152 L100,160" />
                </g>
                <g fill="none" stroke="#111" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M30,40 L40,40 M35,35 L35,45" />
                  <path d="M175,95 L185,95 M180,90 L180,100" />
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* ── Marquee ── */}
        <div className="bg-[#111] text-white py-4 overflow-hidden">
          <div className="marquee text-2xl md:text-3xl font-bold tracking-tight">
            <span className="flex shrink-0">
              成分即時分析&nbsp;
              <span className="text-[#FDE047]">✦</span>&nbsp;AI 營養師&nbsp;
              <span className="text-[#FCA5A5]">✦</span>&nbsp;換食計畫&nbsp;
              <span className="text-[#FDE047]">✦</span>&nbsp;健康日誌&nbsp;
              <span className="text-[#7C9CE3]">✦</span>&nbsp;過敏風險判讀&nbsp;
              <span className="text-[#FDE047]">✦</span>&nbsp;
            </span>
            <span className="flex shrink-0">
              成分即時分析&nbsp;
              <span className="text-[#FDE047]">✦</span>&nbsp;AI 營養師&nbsp;
              <span className="text-[#FCA5A5]">✦</span>&nbsp;換食計畫&nbsp;
              <span className="text-[#FDE047]">✦</span>&nbsp;健康日誌&nbsp;
              <span className="text-[#7C9CE3]">✦</span>&nbsp;過敏風險判讀&nbsp;
              <span className="text-[#FDE047]">✦</span>&nbsp;
            </span>
          </div>
        </div>

        {/* ── Stats ── */}
        <section className="max-w-6xl mx-auto px-5 md:px-6 py-14 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-5xl md:text-6xl font-bold tracking-tight text-[#D98A53]">22</div>
            <div className="text-sm font-bold text-slate-500 mt-1">種成分比對</div>
          </div>
          <div>
            <div className="text-5xl md:text-6xl font-bold tracking-tight text-[#111]">4+</div>
            <div className="text-sm font-bold text-slate-500 mt-1">國際營養標準</div>
          </div>
          <div>
            <div className="text-5xl md:text-6xl font-bold tracking-tight text-[#2D6A4F]">24H</div>
            <div className="text-sm font-bold text-slate-500 mt-1">AI 營養師</div>
          </div>
        </section>

        {/* ── About (GEO-citable) ── */}
        <section className="max-w-5xl mx-auto px-5 md:px-6 pb-16">
          <div className="bg-[#111] text-white rounded-[36px] p-8 md:p-12">
            <h2 className="text-sm font-bold text-[#FDE047] mb-3">關於 PurePaw 無敏毛孩</h2>
            <p className="text-2xl md:text-3xl font-bold leading-snug tracking-tight">
              PurePaw 是<span className="text-[#FCA5A5]">台灣本地</span>
              的 AI 寵物營養分析平台，幫犬貓飼主拍照判讀飼料成分、評估過敏與營養風險、規劃換食計畫。所有分析比對
              AAFCO、FEDIAF 等標準 ——{' '}
              <span className="text-slate-400">內容僅供參考，不取代獸醫診斷。</span>
            </p>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="max-w-6xl mx-auto px-5 md:px-6 py-8">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-none mb-12">
            毛孩的吃，
            <br />
            一個 App 顧好。
          </h2>
          <div className="grid md:grid-cols-2 gap-px bg-black/10 rounded-[32px] overflow-hidden border border-black/10">
            {FEATURES.map((feat, i) => (
              <article key={feat.title} className="bg-[#FFFDFB] p-8 hover:bg-white transition-colors">
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="w-14 h-14 rounded-[20px] flex items-center justify-center"
                    style={{ background: feat.bg }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#111"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dangerouslySetInnerHTML={{ __html: ICON_PATHS[feat.icon] }}
                    />
                  </div>
                  <span className="text-2xl font-bold text-black/10">0{i + 1}</span>
                </div>
                <h3 className="font-bold text-xl mb-2">{feat.title}</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">{feat.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="bg-[#FFE8D6]">
          <div className="max-w-5xl mx-auto px-5 md:px-6 py-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-12">三步驟，開吃。</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-7xl font-bold text-white/70 leading-none mb-3">01</div>
                <h3 className="font-bold text-xl mb-2">建立毛孩檔案</h3>
                <p className="font-medium text-[#3A332C]/80 leading-relaxed">
                  輸入品種、年齡、體重與健康狀況，越完整分析越準。
                </p>
              </div>
              <div>
                <div className="text-7xl font-bold text-white/70 leading-none mb-3">02</div>
                <h3 className="font-bold text-xl mb-2">拍照分析成分</h3>
                <p className="font-medium text-[#3A332C]/80 leading-relaxed">
                  掃描飼料標籤，幾秒鐘得到適合度與風險判讀。
                </p>
              </div>
              <div>
                <div className="text-7xl font-bold text-white/70 leading-none mb-3">03</div>
                <h3 className="font-bold text-xl mb-2">獲得個人化建議</h3>
                <p className="font-medium text-[#3A332C]/80 leading-relaxed">
                  AI 營養師給出飲食調整與換食建議。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="max-w-3xl mx-auto px-5 md:px-6 py-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">問就對了。</h2>
          <p className="font-bold text-slate-500 mb-10">關於 PurePaw 無敏毛孩，你可能想知道的事。</p>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="bg-white rounded-2xl border-2 border-black/5 overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 p-5">
                  <h3 className="font-bold text-base md:text-lg text-slate-900">{item.q}</h3>
                  <svg
                    className="chev shrink-0 text-slate-400"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p className="px-5 pb-5 -mt-1 text-sm font-medium text-slate-600 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-6xl mx-auto px-5 md:px-6 pb-16">
          <div className="bg-[#111] rounded-[40px] px-8 py-16 md:py-24 text-center relative overflow-hidden">
            <div className="absolute -top-8 -right-8 opacity-20">
              <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="#FDE047" strokeWidth="1">
                <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
              </svg>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-none mb-5 relative">
              今天就
              <br className="md:hidden" />
              開始記錄
            </h2>
            <p className="text-slate-400 font-bold mb-9 max-w-md mx-auto relative">
              用 Google 帳號免費開始，幾秒鐘就能分析第一份飼料。
            </p>
            <Link
              href="/"
              className="inline-block bg-white text-[#111] font-bold text-lg rounded-2xl px-10 py-4 hover:bg-slate-100 transition-colors relative"
            >
              免費開始使用 →
            </Link>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="max-w-6xl mx-auto px-5 md:px-6 py-12 border-t border-black/10">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 512 512" width="32" height="32">
                <rect width="512" height="512" rx="115" fill="#FFE8D6" />
                <g
                  transform="translate(100,110) scale(13)"
                  stroke="#111"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  <path d="M21 14.5a6 6 0 01-6 6H9a6 6 0 01-6-6V9a6 6 0 016-6h6a6 6 0 016 6v5.5z" />
                  <circle cx="9" cy="11" r="1.5" fill="#111" stroke="none" />
                  <circle cx="15" cy="11" r="1.5" fill="#111" stroke="none" />
                </g>
              </svg>
              <span className="font-bold">PurePaw 無敏毛孩</span>
            </div>
            <Link href="/" className="text-sm font-bold text-slate-600 hover:text-black transition-colors">
              登入系統 →
            </Link>
          </div>
          <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-3xl mb-3">
            <strong className="text-slate-500">免責聲明：</strong>
            本平台之營養與成分分析由 AI 自動生成，不具任何醫療診斷效力，內容僅供參考，無法取代專業獸醫師之診斷與處置。如毛孩有健康疑慮或急性症狀，請立即諮詢獸醫師。
          </p>
          <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-3xl">
            <strong className="text-slate-500">資料參考來源：</strong>
            世界動物衛生組織、世界獸醫協會、WSAVA、CAPC、OFA、APOP、NRC、AAFCO（美國飼料管理協會）、FEDIAF、PNA、AAVN、Waltham
            Petcare Science Institute、農業部動植物防疫檢疫署、農業部食品藥物管理署、中華民國獸醫師公會全國聯合會、台灣小動物獸醫學會、國立臺灣大學獸醫專業學院、國立中興大學獸醫學系。
          </p>
          <p className="text-[11px] font-bold text-slate-300 mt-6">© 2026 PurePaw 無敏毛孩</p>
        </footer>
      </body>
    </html>
  )
}
