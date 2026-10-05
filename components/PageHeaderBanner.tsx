import React from 'react'

interface PageHeaderBannerProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  badge?: React.ReactNode
  className?: string
}

export default function PageHeaderBanner({
  title,
  subtitle,
  action,
  badge,
  className = '',
}: PageHeaderBannerProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d2a4a] via-[#143c68] to-[#1e4b82] p-6 sm:p-7 text-white shadow-md border border-white/10 ${className}`}
    >
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5 min-w-0">
          {badge && <div className="inline-flex items-center">{badge}</div>}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-blue-100/85 max-w-2xl font-normal leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {action && (
          <div className="relative z-10 flex items-center gap-3 shrink-0">
            {action}
          </div>
        )}
      </div>

      {/* Modern Ambient Glow & Mesh Elements */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-24 -bottom-16 h-56 w-56 rounded-full bg-blue-500/15 blur-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
    </div>
  )
}
