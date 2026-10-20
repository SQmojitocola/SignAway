import React from 'react'
import { getUserJobTitle, getUserBadgeStyle, UserJobInfo } from '@/lib/user-utils'

interface UserJobBadgeProps {
  user?: UserJobInfo | null
  className?: string
  showDot?: boolean
  size?: 'xs' | 'sm' | 'md'
}

export default function UserJobBadge({
  user,
  className = '',
  showDot = true,
  size = 'sm',
}: UserJobBadgeProps) {
  const title = (getUserJobTitle(user) || '').toUpperCase()
  const style = getUserBadgeStyle(user)

  const sizeClasses =
    size === 'xs'
      ? 'px-1.5 py-0.5 text-[8.5px] tracking-wide gap-1'
      : size === 'md'
      ? 'px-2.5 py-1 text-xs tracking-wider gap-1.5'
      : 'px-2 py-0.5 text-[9.5px] tracking-wider gap-1.5'

  const dotSizes =
    size === 'xs' ? 'h-1 w-1' : size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5'

  return (
    <span
      className={`inline-flex items-center rounded-md font-bold uppercase border leading-normal shadow-2xs ${sizeClasses} ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {showDot && (
        <span
          className={`${dotSizes} rounded-full shrink-0 ${style.dot}`}
          aria-hidden="true"
        />
      )}
      <span className="truncate max-w-[220px]" title={title}>
        {title}
      </span>
    </span>
  )
}
