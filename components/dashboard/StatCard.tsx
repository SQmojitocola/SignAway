'use client'

import { Hourglass, CheckCircle2, FolderCheck } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: string
  badgeIcon: string
  colorClass: string
  bgBadgeClass: string
}

export default function StatCard({ title, value, badgeIcon, bgBadgeClass }: StatCardProps) {
  // Render Lucide Icon berdasarkan badgeIcon
  const renderIcon = () => {
    switch (badgeIcon) {
      case 'hourglass_top':
        return <Hourglass className="w-6 h-6 text-amber-500" />
      case 'check_circle':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500" />
      case 'folder_special':
      default:
        return <FolderCheck className="w-6 h-6 text-[#1e4273]" />
    }
  }

  const isPendingCard = badgeIcon === 'hourglass_top'

  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between border transition-all ${
        isPendingCard ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'
      }`}
    >
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3.5 rounded-2xl ${bgBadgeClass} flex items-center justify-center`}>
        {renderIcon()}
      </div>
    </div>
  )
}