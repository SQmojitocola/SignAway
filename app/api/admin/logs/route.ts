import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/logs — Ambil seluruh riwayat SignatureLog
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Akses ditolak.' }, { status: 403 })
  }

  const logs = await prisma.signatureLog.findMany({
    orderBy: { signedAt: 'desc' },
    select: {
      id: true,
      ipAddress: true,
      signedAt: true,
      document: {
        select: { id: true, title: true, status: true },
      },
      signer: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return NextResponse.json({ logs })
}
