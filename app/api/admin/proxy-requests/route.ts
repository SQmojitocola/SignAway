import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET: Ambil daftar pengajuan proxy
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // Cek Role Admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
    }

    const requests = await prisma.proxySignRequest.findMany({
      include: {
        document: {
          select: { id: true, title: true, status: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true, nip: true, department: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true, nip: true, department: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Error fetching proxy requests:', error)
    return NextResponse.json({ error: 'Gagal mengambil data pengajuan proxy.' }, { status: 500 })
  }
}

// PATCH: Approve atau Reject pengajuan proxy
export async function PATCH(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
    }

    const body = await req.json()
    const { requestId, status, rejectionNote } = body

    if (!requestId || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'ID pengajuan dan status baru wajib valid.' }, { status: 400 })
    }

    const updatedRequest = await prisma.proxySignRequest.update({
      where: { id: requestId },
      data: {
        status,
        approvedById: session.user.id,
        rejectionNote: status === 'REJECTED' ? rejectionNote || 'Ditolak oleh Administrator' : null,
      },
    })

    return NextResponse.json({
      message: `Pengajuan proxy berhasil di-${status.toLowerCase()}.`,
      request: updatedRequest,
    })
  } catch (error) {
    console.error('Error updating proxy request:', error)
    return NextResponse.json({ error: 'Gagal memperbarui status pengajuan proxy.' }, { status: 500 })
  }
}