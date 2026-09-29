import React from 'react'

interface PageHeaderBannerProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  badge?: React.ReactNode
}

export default function PageHeaderBanner({
  title,
  subtitle,
  action,
  badge,
}: PageHeaderBannerProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#003b73] via-[#0b4885] to-[#1e4273] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
      <div className="relative z-10 space-y-1">
        {badge && (
          <div className="mb-1">
            {badge}
          </div>
        )}
        <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-blue-100/90 max-w-2xl font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          {action}
        </div>
      )}

      {/* Ornamen Latar Belakang Halus */}
      <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
    </div>
  )
}
