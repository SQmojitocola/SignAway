'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Upload, Settings, LogOut } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'All Documents', href: '/documents', icon: FileText },
    { name: 'Upload', href: '/upload', icon: Upload },
  ]

  return (
    <aside className="w-64 bg-[#1e4273] text-white p-6 flex flex-col justify-between h-screen sticky top-0">
      <div className="space-y-8">
        {/* Logo Application */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center font-bold text-[#1e4273]">
            e
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">e-Sign</h2>
            <p className="text-[10px] text-blue-200">Platform Tanda Tangan Digital</p>
          </div>
        </div>

        {/* Menu Navigasi */}
        <nav className="space-y-2 text-sm">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

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
        <Link
          href="/setting"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
            pathname === '/setting'
              ? 'bg-blue-600 font-semibold text-white shadow-md'
              : 'text-blue-200 hover:text-white hover:bg-blue-800/50'
          }`}
        >
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <button onClick={() => alert('Logout')} className="flex items-center gap-3 px-4 py-2.5 text-red-300 hover:text-red-100 w-full text-left">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  )
}