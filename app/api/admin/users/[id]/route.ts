import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/users/[id] — Ubah role pengguna
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Akses ditolak. Hanya Administrator.' }, { status: 403 })
  }

  const { role } = await req.json()

  if (!['STAFF', 'ATASAN', 'ADMIN'].includes(role)) {
    return NextResponse.json({ message: 'Role tidak valid.' }, { status: 400 })
  }

  // Tidak boleh mengubah role diri sendiri
  if (params.id === session.user.id) {
    return NextResponse.json({ message: 'Anda tidak dapat mengubah role akun Anda sendiri.' }, { status: 400 })
  }

  const updatedUser = await prisma.user.update({
    where: { id: params.id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json({ message: 'Role berhasil diperbarui.', user: updatedUser })
}
