import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET: Ambil semua kontak milik user login
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const contacts = await prisma.contact.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ contacts }, { status: 200 })
  } catch (error) {
    console.error('Fetch Contacts Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

// POST: Simpan kontak baru
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { name, email } = await req.json()

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ message: 'Nama dan Email wajib diisi' }, { status: 400 })
    }

    const newContact = await prisma.contact.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
      },
    })

    return NextResponse.json({ message: 'Kontak berhasil disimpan', contact: newContact }, { status: 201 })
  } catch (error) {
    console.error('Create Contact Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: Hapus kontak
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ message: 'ID kontak diperlukan' }, { status: 400 })
    }

    await prisma.contact.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Kontak berhasil dihapus' }, { status: 200 })
  } catch (error) {
    console.error('Delete Contact Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}