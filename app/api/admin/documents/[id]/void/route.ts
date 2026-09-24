import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/admin/documents/[id]/void — Batalkan paksa dokumen
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Akses ditolak.' }, { status: 403 })
  }

  const { reason } = await req.json()
  if (!reason?.trim()) {
    return NextResponse.json({ message: 'Alasan pembatalan wajib diisi.' }, { status: 400 })
  }

  const document = await prisma.document.findUnique({ where: { id: params.id } })
  if (!document) {
    return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
  }

  if (document.status === 'COMPLETED') {
    return NextResponse.json({ message: 'Dokumen yang sudah selesai tidak dapat dibatalkan.' }, { status: 400 })
  }

  await prisma.document.update({
    where: { id: params.id },
    data: {
      status: 'REJECTED',
      rejectReason: `[DIBATALKAN ADMIN] ${reason}`,
    },
  })

  return NextResponse.json({ message: 'Dokumen berhasil dibatalkan oleh Administrator.' })
}
