import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// 📍 POST: Kirim permohonan / laporan ke administrator (Bisa diakses publik dari halaman login)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, name, purpose, message } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email / Gmail yang valid wajib diisi.' },
        { status: 400 }
      )
    }

    const cleanPurpose = purpose === 'REPORT_ISSUE' ? 'REPORT_ISSUE' : 'CREATE_ACCOUNT'

    if (cleanPurpose === 'REPORT_ISSUE' && (!message || !message.trim())) {
      return NextResponse.json(
        { error: 'Pesan kendala atau laporan wajib diisi.' },
        { status: 400 }
      )
    }

    const newMessage = await prisma.adminMessage.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
        purpose: cleanPurpose,
        message: message?.trim() || null,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Pesan permohonan berhasil dikirim ke Administrator.',
      data: newMessage,
    })
  } catch (error) {
    console.error('Error submitting contact admin message:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat mengirim permohonan.' },
      { status: 500 }
    )
  }
}

// 📍 GET: Mengambil daftar inbox pesan untuk Administrator
export async function GET(req: Request) {
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
      return NextResponse.json(
        { error: 'Akses ditolak. Fitur Inbox hanya untuk Administrator.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status')
    const purposeParam = searchParams.get('purpose')
    const query = searchParams.get('q')

    const whereClause: {
      status?: 'PENDING' | 'RESOLVED'
      purpose?: 'CREATE_ACCOUNT' | 'REPORT_ISSUE'
      OR?: Array<
        | { email: { contains: string; mode: 'insensitive' } }
        | { name: { contains: string; mode: 'insensitive' } }
        | { message: { contains: string; mode: 'insensitive' } }
      >
    } = {}

    if (statusParam && (statusParam === 'PENDING' || statusParam === 'RESOLVED')) {
      whereClause.status = statusParam
    }

    if (purposeParam && (purposeParam === 'CREATE_ACCOUNT' || purposeParam === 'REPORT_ISSUE')) {
      whereClause.purpose = purposeParam
    }

    if (query?.trim()) {
      whereClause.OR = [
        { email: { contains: query.trim(), mode: 'insensitive' } },
        { name: { contains: query.trim(), mode: 'insensitive' } },
        { message: { contains: query.trim(), mode: 'insensitive' } },
      ]
    }

    const messages = await prisma.adminMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    })

    const totalPending = await prisma.adminMessage.count({
      where: { status: 'PENDING' },
    })

    return NextResponse.json({
      success: true,
      messages,
      totalPending,
    })
  } catch (error) {
    console.error('Error fetching admin inbox:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data inbox pesan.' },
      { status: 500 }
    )
  }
}

// 📍 PATCH: Update status pesan (Tandai Selesai / Pending)
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
      return NextResponse.json(
        { error: 'Akses ditolak. Fitur Inbox hanya untuk Administrator.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { id, status } = body

    if (!id || !status || (status !== 'PENDING' && status !== 'RESOLVED')) {
      return NextResponse.json(
        { error: 'ID pesan dan status valid (PENDING / RESOLVED) wajib disertakan.' },
        { status: 400 }
      )
    }

    const updated = await prisma.adminMessage.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({
      success: true,
      message: `Pesan berhasil ditandai sebagai ${status === 'RESOLVED' ? 'Selesai' : 'Pending'}.`,
      data: updated,
    })
  } catch (error) {
    console.error('Error updating admin message:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui status pesan.' },
      { status: 500 }
    )
  }
}

// 📍 DELETE: Hapus pesan dari Inbox
export async function DELETE(req: Request) {
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
      return NextResponse.json(
        { error: 'Akses ditolak. Fitur Inbox hanya untuk Administrator.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID pesan wajib disertakan.' }, { status: 400 })
    }

    await prisma.adminMessage.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Pesan berhasil dihapus dari Inbox.',
    })
  } catch (error) {
    console.error('Error deleting admin message:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus pesan.' },
      { status: 500 }
    )
  }
}
