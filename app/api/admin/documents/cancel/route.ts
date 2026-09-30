import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Cek Role Admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Akses ditolak. Fitur pembatalan hanya untuk Administrator.' },
        { status: 403 }
      )
    }

    const { documentId, reason } = await req.json()

    if (!documentId) {
      return NextResponse.json({ message: 'ID Dokumen wajib disertakan.' }, { status: 400 })
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, status: true, title: true },
    })

    if (!doc) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }

    if (!['PENDING', 'PARTIAL_SIGNED'].includes(doc.status)) {
      return NextResponse.json(
        {
          message: `Dokumen dengan status ${doc.status} tidak dapat dibatalkan. Pembatalan hanya berlaku untuk dokumen yang sedang dalam proses tanda tangan.`,
        },
        { status: 400 }
      )
    }

    const cancelReason =
      typeof reason === 'string' && reason.trim()
        ? `[Dibatalkan Admin] ${reason.trim()}`
        : '[Dibatalkan Admin] Terjadi kendala sistem pada alur penandatanganan.'

    await prisma.$transaction([
      // 1. Ubah status Dokumen Utama menjadi REJECTED
      prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'REJECTED',
          rejectReason: cancelReason,
        },
      }),
      // 2. Batalkan seluruh penerima yang antreannya masih belum tuntas (WAITING atau PENDING)
      prisma.documentRecipient.updateMany({
        where: {
          documentId,
          status: { in: ['WAITING', 'PENDING'] },
        },
        data: {
          status: 'REJECTED',
          rejectReason: cancelReason,
        },
      }),
    ])

    return NextResponse.json(
      { message: 'Proses penandatanganan dokumen berhasil dibatalkan.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Admin cancel document error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan internal server saat membatalkan dokumen.' },
      { status: 500 }
    )
  }
}
