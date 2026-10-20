export type JobLevelType = 'GENERAL_MANAGER' | 'HEAD_SECTION' | 'STAFF'

export interface UserJobInfo {
  role?: string | null
  jobLevel?: 'GENERAL_MANAGER' | 'HEAD_SECTION' | 'STAFF' | string | null
  position?: string | null
  department?: string | null
}

/**
 * Menghasilkan teks jabatan lengkap yang rapi dan kontekstual.
 * Contoh:
 * - GENERAL_MANAGER + "Operasional" -> "General Manager Operasional"
 * - HEAD_SECTION + "Keuangan" -> "Section Head Keuangan"
 * - HEAD_SECTION + "Koordinator Project" -> "Head Section Koordinator Project"
 * - STAFF + "Piutang" -> "Staff/PIC Piutang"
 * - ADMIN -> "Administrator"
 */
export function getUserJobTitle(user?: UserJobInfo | null): string {
  if (!user) return 'Staff/PIC'

  const level = user.jobLevel
  const specific = user.position?.trim() || ''

  // Jika General Manager
  if (level === 'GENERAL_MANAGER') {
    if (!specific) return 'General Manager'
    if (specific.toLowerCase().startsWith('general manager') || specific.toLowerCase().startsWith('gm')) {
      return specific
    }
    return `General Manager ${specific}`
  }

  // Jika Head Section / Section Head
  if (level === 'HEAD_SECTION') {
    if (!specific) return 'Section Head'
    const lower = specific.toLowerCase()
    if (lower.startsWith('section head') || lower.startsWith('head section')) {
      return specific
    }
    // Jika spesifik berupa Koordinator -> "Head Section Koordinator Project"
    if (lower.startsWith('koordinator')) {
      return `Head Section ${specific}`
    }
    return `Section Head ${specific}`
  }

  // Jika Admin tanpa GM/Head Section
  if (user.role === 'ADMIN' && (!level || level === 'STAFF')) {
    return specific ? `Administrator ${specific}` : 'Administrator'
  }

  // Default: Staff / PIC
  if (!specific) return 'Staff/PIC'
  const lower = specific.toLowerCase()
  if (lower.startsWith('staff') || lower.startsWith('pic') || lower.startsWith('staf')) {
    return specific
  }
  return `Staff/PIC ${specific}`
}

/**
 * Styling tema badge berdasarkan tingkat jabatan
 */
export function getUserBadgeStyle(user?: UserJobInfo | null) {
  const level = user?.jobLevel
  const isAdmin = user?.role === 'ADMIN' && (!level || level === 'STAFF')

  if (isAdmin) {
    return {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200/90',
      dot: 'bg-purple-500',
      levelName: 'Administrator',
    }
  }

  if (level === 'GENERAL_MANAGER') {
    return {
      bg: 'bg-amber-50/90',
      text: 'text-amber-800',
      border: 'border-amber-300/80',
      dot: 'bg-amber-500',
      levelName: 'General Manager',
    }
  }

  if (level === 'HEAD_SECTION') {
    return {
      bg: 'bg-blue-50/90',
      text: 'text-blue-700',
      border: 'border-blue-200/90',
      dot: 'bg-blue-500',
      levelName: 'Section Head',
    }
  }

  // STAFF (default)
  return {
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-700',
    border: 'border-emerald-200/90',
    dot: 'bg-emerald-500',
    levelName: 'Staff/PIC',
  }
}
