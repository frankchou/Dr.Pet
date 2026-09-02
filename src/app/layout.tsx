import type { Metadata, Viewport } from 'next'
import './globals.css'
import ClientShell from '@/components/layout/ClientShell'
import SessionProviderWrapper from '@/components/layout/SessionProviderWrapper'
import AppShell from '@/components/layout/AppShell'
import { getSiteUrl } from '@/lib/siteUrl'

const SITE_URL = getSiteUrl()
const SITE_TITLE = 'PurePaw 無敏毛孩'
const SITE_DESCRIPTION = '專屬台灣毛孩的 AI 寵物營養健康管理平台'

export const metadata: Metadata = {
  // metadataBase 決定 og:image 等相對路徑要展開成哪個網域。沒設的話 LINE / Facebook
  // 爬蟲拿到相對路徑就抓不到預覽圖；值依 dev / preview / production 各自解析（見 src/lib/siteUrl.ts）。
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/app-logo.png',
    apple: '/app-logo.png',
    shortcut: '/app-logo.png',
  },
  appleWebApp: {
    capable: true,
    title: '無敏毛孩 PurePaw',
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'zh_TW',
    // 暫用 app-logo（992×1061）。之後補 1200×630 專用分享圖可直接換這裡。
    images: [{ url: '/app-logo.png', width: 992, height: 1061, alt: SITE_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/app-logo.png'],
  },
}

// viewportFit: 'cover' 讓 env(safe-area-inset-*) 生效（手機 bottom-sheet modal 底部安全區，見待辦 2-6）
// themeColor 用品牌色，搭配 PWA manifest 讓加入主畫面/standalone 體驗一致
export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#C4714A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-[#F4F7FB]">
        <SessionProviderWrapper>
          <ClientShell>
            <AppShell>
              {children}
            </AppShell>
          </ClientShell>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
