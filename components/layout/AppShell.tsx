'use client'

import Sidebar from '@/components/Sidebar'
import { usePathname } from 'next/navigation'
import AuthProvider from '@/components/providers/AuthProvider'

export default function AppShell({
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
    pathname.includes('/sign') ||
    pathname.includes('/success')

  return (
    <AuthProvider>
      {isHideSidebar ? (
        <main className="w-full min-h-screen">{children}</main>
      ) : (
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 min-w-0">{children}</main>
        </div>
      )}
    </AuthProvider>
  )
}
