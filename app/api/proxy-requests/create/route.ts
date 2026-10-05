import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const body = await req.json()
    const { documentId, targetUserId, reason } = body

    if (!documentId || !targetUserId || !reason) {
      return NextResponse.json(
        { error: 'Dokumen, Target User, dan Alasan wajib diisi.' },
        { status: 400 }
      )
    }

    // Cek apakah sudah pernah ada pengajuan yang PENDING atau APPROVED
    const existingRequest = await prisma.proxySignRequest.findFirst({
      where: {
        documentId,
        requestedById: session.user.id,
        targetUserId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Pengajuan proxy untuk dokumen ini sudah ada atau telah disetujui.' },
        { status: 400 }
      )
    }

    const newRequest = await prisma.proxySignRequest.create({
      data: {
        documentId,
        requestedById: session.user.id,
        targetUserId,
        reason,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      message: 'Pengajuan perwakilan TTD berhasil dikirim ke Administrator.',
      request: newRequest,
    })
  } catch (error) {
    console.error('Error creating proxy request:', error)
    return NextResponse.json({ error: 'Gagal mengajukan perwakilan TTD.' }, { status: 500 })
  }
}