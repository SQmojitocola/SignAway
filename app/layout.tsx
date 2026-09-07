'use client'

import Sidebar from '@/components/Sidebar'
import { usePathname } from 'next/navigation'
import '@/app/globals.css' // Sesuaikan path css kamu

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Sembunyikan Sidebar untuk halaman Login dan Register
  const isAuthPage = pathname === '/login' || pathname === '/register'

  return (
    <html lang="id">
      <body className="bg-slate-100 min-h-screen">
        {isAuthPage ? (
          // Jika halaman Login / Register: tampilkan full screen tanpa Sidebar
          <main>{children}</main>
        ) : (
          // Jika halaman Dashboard / Upload / Dokumen: tampilkan Sidebar + Konten
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8">{children}</main>
          </div>
        )}
      </body>
    </html>
  )
}