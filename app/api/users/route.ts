import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/password'

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
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          nip: true,
          department: true,
          signatureSpecimen: true,
          specimens: {
            where: { isPrimary: true, type: 'SIGNATURE' },
            select: { imageUrl: true },
            take: 1,
          },
        },
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
        nip: true,
        department: true,
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

    const { name, email, nip } = await req.json()
    const normalizedName = typeof name === 'string' ? name.trim() : ''
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedNip = typeof nip === 'string' ? nip.trim() : undefined

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

    if (normalizedNip) {
      const existingNip = await prisma.user.findFirst({
        where: {
          nip: normalizedNip,
          NOT: { id: session.user.id },
        },
        select: { id: true },
      })
      if (existingNip) {
        return NextResponse.json({ message: 'NIP/NIK sudah digunakan oleh pengguna lain' }, { status: 409 })
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: normalizedName,
        email: normalizedEmail,
        ...(normalizedNip !== undefined ? { nip: normalizedNip || null } : {}),
      },
      select: { id: true, name: true, email: true, nip: true, department: true },
    })

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Kata sandi saat ini dan baru wajib diisi' }, { status: 400 })
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ message: 'Kata sandi baru minimal 8 karakter' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    })

    if (!user) {
      return NextResponse.json({ message: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ message: 'Kata sandi saat ini tidak cocok' }, { status: 400 })
    }

    const newHashedPassword = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHashedPassword },
    })

    return NextResponse.json({ message: 'Kata sandi berhasil diperbarui' }, { status: 200 })
  } catch (error) {
    console.error('Password update error:', error)
    return NextResponse.json({ message: 'Gagal memperbarui kata sandi' }, { status: 500 })
  }
}

