import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
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
      return NextResponse.json({ error: 'Akses ditolak. Memerlukan hak akses Admin.' }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, password, nip, department, role } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nama, Email, dan Password wajib diisi.' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email sudah terdaftar di sistem.' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        nip: nip || null,
        department: department || null,
        role: role || 'KARYAWAN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nip: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ message: 'Karyawan berhasil ditambahkan', user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Gagal menambahkan karyawan.' }, { status: 500 })
  }
}