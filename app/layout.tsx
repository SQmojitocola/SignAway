import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import AppShell from '@/components/layout/AppShell'
import '@/app/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SignAway - Platform Manajemen Pengesahan Dokumen Digital',
  description: 'Aplikasi pengelolaan tanda tangan dan verifikasi dokumen digital resmi instansi.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans bg-slate-100 min-h-screen text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}