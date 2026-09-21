'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  LayoutDashboard, 
  Users, 
  Upload, 
  Settings, 
  LogOut, 
  FolderOpen, 
  PenTool, 
  ShieldCheck // 📍 Import ikon Verifikasi
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Draft', href: '/drafts', icon: FolderOpen },
    { name: 'Atribut Pengesahan', href: '/specimens', icon: PenTool },
    { name: 'Daftar Kontak', href: '/contacts', icon: Users },
    { name: 'Upload', href: '/upload', icon: Upload },
    { name: 'Verifikasi Dokumen', href: '/verify/check', icon: ShieldCheck }, // 📍 MENU BARU DITAMBAHKAN
  ]

  return (
    <aside className="w-64 bg-[#1e4273] text-white p-6 flex flex-col justify-between h-screen sticky top-0">
      <div className="space-y-8">
        {/* Logo Card */}
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-md border border-white/20">
          <div className="relative h-10 w-12 shrink-0">
            <Image
              src="/assets/logo-dashboard.png"
              alt="Logo Surveyor Indonesia"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-2xl leading-tight text-[#1e4273]">E-Sign</h2>
            <p className="text-[8px] font-medium text-blue-500 leading-tight truncate">
              Platform Tanda Tangan Digital
            </p>
          </div>
        </div>

        {/* Menu Navigasi */}
        <nav className="space-y-2 text-sm">
          {menuItems.map((item) => {
            const Icon = item.icon
            // Menandai menu aktif jika pathname persis sama atau diawali jalur tersebut
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-blue-600 font-semibold text-white shadow-md'
                    : 'text-blue-100 hover:bg-blue-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Navigasi */}
      <div className="space-y-2 text-sm border-t border-blue-800/60 pt-4">
        <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-blue-200 hover:text-white">
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <button
          onClick={() => {
            void signOut({ callbackUrl: '/login' })
            router.refresh()
          }}
          className="flex items-center gap-3 px-4 py-2.5 text-red-300 hover:text-red-100 w-full text-left"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  )
}