import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: session.user.id }, // Jangan sertakan diri sendiri
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching user list:', error)
    return NextResponse.json({ error: 'Gagal mengambil daftar pengguna.' }, { status: 500 })
  }
}