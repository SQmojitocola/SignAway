'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  Upload,
  Settings,
  LogOut,
  FolderOpen,
  PenTool,
  ShieldCheck,
  FileCheck,
  FileSearch,
  ShieldAlert,
  Mail
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  // 📍 Sinkronkan role dari session atau cek jika sedang di route /admin
  const sessionRole = (session?.user as { role?: string } | undefined)?.role
  const userRole = sessionRole || (pathname.startsWith('/admin') ? 'ADMIN' : null)
  const isAdmin = userRole === 'ADMIN' || pathname.startsWith('/admin')

  // Menu Khusus Administrator
  const adminMenuItems = [
    { name: 'Dashboard Admin', href: '/admin/dashboard', icon: LayoutDashboard },
    // Fitur delegasi disembunyikan sementara sesuai kebijakan instansi
    // { name: 'Izin Proxy TTD', href: '/admin/proxy-requests', icon: FileCheck },
    { name: 'Inbox Pesan', href: '/admin/inbox', icon: Mail },
    { name: 'Monitoring Dokumen', href: '/admin/documents', icon: FileSearch },
    { name: 'Manajemen Karyawan', href: '/admin/users', icon: Users },
  ]

  // Menu Khusus Karyawan / Staff Biasa
  const staffMenuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Draft', href: '/drafts', icon: FolderOpen },
    { name: 'Atribut Pengesahan', href: '/specimens', icon: PenTool },
    { name: 'Daftar Kontak', href: '/contacts', icon: Users },
    { name: 'Upload', href: '/upload', icon: Upload },
    { name: 'Verifikasi Dokumen', href: '/verify/check', icon: ShieldCheck },
  ]

  const activeMenuItems = isAdmin ? adminMenuItems : staffMenuItems

  return (
    <aside className="w-64 bg-[#1e4273] text-white p-6 flex flex-col justify-between h-screen sticky top-0 shrink-0 font-sans">
      <div className="space-y-6">
        {/* Logo Card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-md border border-white/20">
          <div className="flex items-center justify-between">
            {/* 🏷️ Logo E-Sign (Ukuran & Posisi dapat disesuaikan lewat class text-* dan margin) */}
            <div className="flex items-center select-none overflow-visible">
              <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 bg-clip-text text-transparent">
                E-
              </span>
              <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-blue-600 bg-clip-text text-transparent italic -ml-1 pr-1 leading-normal">
                Sign
              </span>
            </div>

            {isAdmin && (
              <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-md border border-purple-200 shrink-0">
                ADMIN
              </span>
            )}
          </div>

          {/* Subteks Platform */}
          <p className="mt-1 text-[10px] font-semibold text-slate-500 leading-tight">
            Platform Manajemen Pengesahan
          </p>
        </div>

        {/* Header Kategori & Navigasi */}
        <div>
          <p className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-200/60 mb-2 flex items-center gap-1.5">
            {isAdmin ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                Panel Administrator
              </>
            ) : (
              'Menu Utama'
            )}
          </p>

          {/* Navigasi Dinamis */}
          <nav className="space-y-1.5 text-sm">
            {activeMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${isActive
                      ? 'bg-blue-600 font-semibold text-white shadow-md'
                      : 'text-blue-100 hover:bg-blue-800/50'
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs">{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Footer Navigasi Settings & Logout */}
      <div className="space-y-1.5 text-sm border-t border-blue-800/60 pt-4">
        <Link
          href="/setting"
          className={`flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all ${pathname === '/setting'
              ? 'bg-blue-600 font-semibold text-white shadow-md'
              : 'text-blue-200 hover:text-white hover:bg-blue-800/50'
            }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs font-medium">Settings</span>
        </Link>

        <button
          onClick={() => {
            void signOut({ callbackUrl: '/login' })
            router.refresh()
          }}
          className="flex items-center gap-3 px-3.5 py-2 text-red-300 hover:text-red-100 w-full text-left rounded-xl hover:bg-red-500/20 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  )
}