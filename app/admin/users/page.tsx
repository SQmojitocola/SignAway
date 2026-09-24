import { requireAdmin } from '@/lib/requireAdmin'
import AdminUsersClient from '@/components/admin/AdminUsersClient'
import { prisma } from '@/lib/prisma'

export default async function AdminUsersPage() {
  await requireAdmin()

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          specimens: true,
          sentDocuments: true,
        },
      },
    },
  })

  return (
    <main className="w-full max-w-6xl mx-auto py-8 px-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Administrator</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Manajemen Pengguna</h1>
        <p className="text-sm font-normal text-slate-500 mt-1">
          Kelola akun pegawai terdaftar dan atur hak akses peran sistem.
        </p>
      </div>
      <AdminUsersClient initialUsers={users.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))} />
    </main>
  )
}
