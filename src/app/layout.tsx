import type { Metadata } from 'next'
import './globals.css'
import ClientShell from '@/components/layout/ClientShell'
import SessionProviderWrapper from '@/components/layout/SessionProviderWrapper'
import AppShell from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'PurePaw 無敏毛孩',
  description: '專屬台灣毛孩的 AI 寵物營養健康管理平台',
  icons: {
    icon: '/app-logo.png',
    apple: '/app-logo.png',
    shortcut: '/app-logo.png',
  },
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
