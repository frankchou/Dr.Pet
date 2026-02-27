import type { Metadata } from 'next'
import './globals.css'
import BottomNav from '@/components/layout/BottomNav'
import ClientShell from '@/components/layout/ClientShell'

export const metadata: Metadata = {
  title: '寵物隨行醫師 Dr. Pet',
  description: '您的寵物健康管理助理',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">
        <div className="min-h-screen bg-[#F8F9FF]">
          <div className="max-w-[480px] mx-auto min-h-screen relative">
            <ClientShell>
              <main className="pb-20">{children}</main>
            </ClientShell>
          </div>
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
