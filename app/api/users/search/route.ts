import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    // 1. Cek Autentikasi User
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 2. Ambil Query Email dari URL
    const { searchParams } = new URL(req.url)
    const emailQuery = searchParams.get('email')

    if (!emailQuery) {
      return NextResponse.json({ message: 'Parameter email wajib diisi' }, { status: 400 })
    }

    // 3. Cari User di Database (Case-Insensitive & Trim Space)
    const cleanEmail = emailQuery.trim().toLowerCase()

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive', // Mencari tanpa memedulikan huruf besar/kecil
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json({ message: 'User tidak ditemukan', user: null }, { status: 404 })
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error('Search User Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}