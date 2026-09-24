import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/documents — Semua dokumen di sistem
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Akses ditolak.' }, { status: 403 })
  }

  const documents = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      rejectReason: true,
      sender: { select: { id: true, name: true, email: true } },
      recipients: {
        select: {
          id: true,
          status: true,
          signingOrder: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  return NextResponse.json({ documents })
}
