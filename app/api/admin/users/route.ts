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
        status: 'ACTIVE',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nip: true,
        department: true,
        status: true,
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

export async function PUT(req: Request) {
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
    const { id, name, email, password, nip, department, role, status } = body

    if (!id) {
      return NextResponse.json({ error: 'ID Pengguna wajib disertakan.' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 })
    }

    // Cek jika email diubah dan sudah dipakai akun lain
    if (email && email !== targetUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      })
      if (emailExists) {
        return NextResponse.json({ error: 'Email sudah digunakan oleh akun lain.' }, { status: 400 })
      }
    }

    // Cek jika NIP diubah dan sudah dipakai akun lain
    if (nip && nip !== targetUser.nip) {
      const nipExists = await prisma.user.findUnique({
        where: { nip },
      })
      if (nipExists) {
        return NextResponse.json({ error: 'NIP sudah digunakan oleh akun lain.' }, { status: 400 })
      }
    }

    const updateData: {
      name?: string
      email?: string
      nip?: string | null
      department?: string | null
      role?: 'ADMIN' | 'KARYAWAN'
      status?: 'ACTIVE' | 'FROZEN' | 'DELETED'
      isActive?: boolean
      passwordHash?: string
    } = {}

    if (name) updateData.name = name
    if (email) updateData.email = email
    if (nip !== undefined) updateData.nip = nip || null
    if (department !== undefined) updateData.department = department || null
    if (role) updateData.role = role

    if (status) {
      updateData.status = status
      updateData.isActive = status === 'ACTIVE'
    }

    // Jika password diisi, lakukan hash dan ganti password
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter.' }, { status: 400 })
      }
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nip: true,
        department: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ message: 'Data karyawan berhasil diperbarui.', user: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Gagal memperbarui data karyawan.' }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: 'Akses ditolak. Memerlukan hak akses Admin.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID Pengguna wajib disertakan.' }, { status: 400 })
    }

    if (id === session.user.id) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun admin yang sedang digunakan.' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sentDocuments: true,
            recipients: true,
            signatureLogs: true,
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 })
    }

    const hasHistory =
      targetUser._count.sentDocuments > 0 ||
      targetUser._count.recipients > 0 ||
      targetUser._count.signatureLogs > 0

    if (hasHistory) {
      await prisma.user.update({
        where: { id },
        data: {
          status: 'DELETED',
          isActive: false,
        },
      })
      return NextResponse.json({
        message: 'Karyawan memiliki riwayat dokumen. Akun berhasil ditandai sebagai Dihapus.',
        isSoftDeleted: true,
      })
    } else {
      await prisma.user.delete({
        where: { id },
      })
      return NextResponse.json({
        message: 'Akun karyawan berhasil dihapus permanen.',
        isSoftDeleted: false,
      })
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Gagal menghapus karyawan.' }, { status: 500 })
  }
}