import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID diperlukan' }, { status: 400 })
    }

    // Cek permohonan proxy terbaru dari user ini untuk dokumen ini
    const latestRequest = await prisma.proxySignRequest.findFirst({
      where: {
        documentId,
        requestedById: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            department: true,
          },
        },
      },
    })

    const approvedProxy = latestRequest?.status === 'APPROVED' ? latestRequest : null

    return NextResponse.json({
      approvedProxy,
      latestRequest,
    })
  } catch (error) {
    console.error('Error checking proxy status:', error)
    return NextResponse.json({ error: 'Gagal memeriksa status proxy' }, { status: 500 })
  }
}