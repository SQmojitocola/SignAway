'use client';

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { FilePenLine, FileText, FolderOpen, Landmark, LayoutDashboard, Settings, Upload } from "lucide-react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Draft', href: '/drafts', icon: FolderOpen },
    { name: 'All Documents', href: '/documents', icon: FileText },
    { name: 'Upload', href: '/upload', icon: Upload },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#254872] flex flex-col py-4 z-40">
      {/* Logo & Title */}
      <div className="px-6 pb-6 border-b border-white/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <Landmark className="h-6 w-6 text-[#003b73]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">E-Sign</h1>
            <p className="text-xs text-blue-200">Corporate Portal</p>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="px-6 mb-6">
        <button className="w-full bg-[#003b73] hover:bg-[#002d58] text-white transition-colors h-11 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold shadow-sm">
          <FilePenLine className="h-5 w-5" aria-hidden="true" />
          Sign Document
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 border-l-4 font-medium text-sm transition-all ${
                isActive
                  ? 'bg-[#00529c] text-white border-white'
                  : 'text-blue-100 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Bottom Links */}
      <div className="flex flex-col gap-1 mt-auto pb-2 border-t border-white/10 pt-4">
        <Link href="/setting" className="flex items-center gap-3 px-6 py-2.5 text-blue-100 hover:text-white hover:bg-white/5 transition-all border-l-4 border-transparent font-medium text-sm">
          <Settings className="h-5 w-5" aria-hidden="true" />
          Settings
        </Link>
        <button
          onClick={() => {
            void signOut({ callbackUrl: '/login' });
            router.refresh();
          }}
          className="flex w-full items-center gap-3 px-6 py-2.5 text-blue-100 hover:text-white hover:bg-white/5 transition-all border-l-4 border-transparent font-medium text-sm"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}