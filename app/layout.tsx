'use client'

import Sidebar from '@/components/Sidebar' // <-- Ubah 'sidebar' menjadi 'Sidebar' (S besar)
import { usePathname } from 'next/navigation'
import '@/app/globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Sembunyikan Sidebar untuk Login, Register, Editor Plotting, dan Konfirmasi Pengiriman
  const isHideSidebar = 
    pathname === '/login' || 
    pathname === '/register' ||
    pathname.includes('/edit') || 
    pathname.includes('/success')

  return (
    <html lang="id">
      <body className="bg-slate-100 min-h-screen">
        {isHideSidebar ? (
          <main className="w-full min-h-screen">{children}</main>
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8">{children}</main>
          </div>
        )}
      </body>
    </html>
  )
}