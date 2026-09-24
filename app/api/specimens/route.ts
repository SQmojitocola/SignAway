import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Ambil semua spesimen milik user (TTD & Paraf) + migrasi otomatis spesimen lama
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Ambil user beserta specimens
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { specimens: { orderBy: { createdAt: 'desc' } } },
    })

    if (!user) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 })
    }

    // 📍 Migrasi Otomatis: Jika user punya signatureSpecimen di register tapi belum ada di tabel UserSpecimen
    if (user.signatureSpecimen && user.specimens.length === 0) {
      const legacySpecimen = await prisma.userSpecimen.create({
        data: {
          userId: user.id,
          type: 'SIGNATURE',
          imageUrl: user.signatureSpecimen,
          isPrimary: true,
        },
      })
      user.specimens = [legacySpecimen]
    }

    return NextResponse.json({ specimens: user.specimens })
  } catch (error) {
    console.error('Fetch specimens error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

// POST: Tambah spesimen baru (TTD atau Paraf)
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { type, imageUrl, setAsPrimary } = await req.json()

    if (!imageUrl || !type) {
      return NextResponse.json({ message: 'Data spesimen tidak lengkap' }, { status: 400 })
    }

    const userId = session.user.id

    // Jika di-set sebagai utama, matikan isPrimary spesimen lain pada tipe yang sama
    if (setAsPrimary) {
      await prisma.userSpecimen.updateMany({
        where: { userId, type },
        data: { isPrimary: false },
      })
    }

    const newSpecimen = await prisma.userSpecimen.create({
      data: {
        userId,
        type, // 'SIGNATURE' | 'PARAF'
        imageUrl,
        isPrimary: setAsPrimary || false,
      },
    })

    // Update juga field legacy signatureSpecimen jika ini TTD utama
    if (type === 'SIGNATURE' && setAsPrimary) {
      await prisma.user.update({
        where: { id: userId },
        data: { signatureSpecimen: imageUrl },
      })
    }

    return NextResponse.json({ message: 'Spesimen berhasil ditambahkan', specimen: newSpecimen })
  } catch (error) {
    console.error('Create specimen error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: Hapus spesimen
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ message: 'ID spesimen wajib diisi' }, { status: 400 })
    }

    await prisma.userSpecimen.delete({
      where: { id, userId: session.user.id },
    })

    return NextResponse.json({ message: 'Spesimen berhasil dihapus' })
  } catch (error) {
    console.error('Delete specimen error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH: Ubah spesimen pilihan menjadi Spesimen Utama (Primary)
export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const { id, type } = body

    if (!id || !type) {
      return NextResponse.json({ message: 'ID dan Tipe spesimen wajib diisi' }, { status: 400 })
    }

    // 📍 Gunakan Transaction & Model UserSpecimen dengan field isPrimary
    await prisma.$transaction([
      prisma.userSpecimen.updateMany({
        where: { userId, type },
        data: { isPrimary: false },
      }),
      prisma.userSpecimen.update({
        where: { id, userId },
        data: { isPrimary: true },
      }),
    ])

    return NextResponse.json({ message: 'Spesimen utama berhasil diperbarui' }, { status: 200 })
  } catch (error) {
    console.error('Update primary specimen error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}