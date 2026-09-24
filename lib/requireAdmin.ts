import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * Helper untuk memproteksi halaman Admin.
 * Gunakan di bagian atas setiap Server Component di /app/admin/...
 * - Jika belum login      -> redirect ke /login
 * - Jika bukan ADMIN      -> redirect ke /dashboard
 * - Jika ADMIN            -> mengembalikan session
 */
export async function requireAdmin() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return session
}
