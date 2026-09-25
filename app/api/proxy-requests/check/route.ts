import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const documentId = new URL(req.url).searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'ID dokumen wajib diisi.' }, { status: 400 })
    }

    const approvedProxy = await prisma.proxySignRequest.findFirst({
      where: {
        documentId,
        requestedById: session.user.id,
        status: 'APPROVED',
      },
      select: {
        id: true,
        targetUser: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ approvedProxy })
  } catch (error) {
    console.error('Error checking proxy status:', error)
    return NextResponse.json({ error: 'Gagal mengecek status proxy.' }, { status: 500 })
  }
}