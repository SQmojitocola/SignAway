import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, reason } = await req.json()

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { message: 'Alasan penolakan wajib diisi. Silakan tuliskan alasan Anda.' },
        { status: 400 }
      )
    }

    if (!documentId) {
      return NextResponse.json({ message: 'ID Dokumen wajib diisi' }, { status: 400 })
    }

    const recipient = await prisma.documentRecipient.findFirst({
      where: { documentId, userId: session.user.id },
    })

    if (!recipient) {
      return NextResponse.json(
        { message: 'Anda tidak terdaftar sebagai penandatangan' },
        { status: 404 }
      )
    }

    const cleanReason = reason.trim()

    await prisma.$transaction([
      prisma.documentRecipient.update({
        where: { id: recipient.id },
        data: { status: 'REJECTED', rejectReason: cleanReason },
      }),
      prisma.document.update({
        where: { id: documentId },
        data: { status: 'REJECTED', rejectReason: cleanReason },
      }),
    ])

    return NextResponse.json({ message: 'Dokumen berhasil ditolak' })
  } catch (error) {
    console.error('Reject document error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}