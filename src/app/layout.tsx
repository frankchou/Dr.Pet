import type { Metadata, Viewport } from 'next'
import './globals.css'
import ClientShell from '@/components/layout/ClientShell'
import SessionProviderWrapper from '@/components/layout/SessionProviderWrapper'
import AppShell from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'PurePaw 無敏毛孩',
  description: '專屬台灣毛孩的 AI 寵物營養健康管理平台',
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
