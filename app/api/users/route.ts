import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = new URL(req.url).searchParams
    const email = searchParams.get('email')?.trim().toLowerCase()
    if (searchParams.get('me') === 'true') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true },
      })
      return NextResponse.json({ user }, { status: 200 })
    }
    if (!email) {
      return NextResponse.json({ message: 'Email wajib diisi' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json({ message: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { name, email } = await req.json()
    const normalizedName = typeof name === 'string' ? name.trim() : ''
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!normalizedName || !normalizedEmail) {
      return NextResponse.json({ message: 'Nama dan email wajib diisi' }, { status: 400 })
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id: session.user.id },
      },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ message: 'Email sudah digunakan pengguna lain' }, { status: 409 })
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: normalizedName, email: normalizedEmail },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
