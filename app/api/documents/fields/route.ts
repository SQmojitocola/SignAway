import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

interface FieldInput {
  recipientId: string
  pageNumber: number
  posX: number
  posY: number
  width?: number
  height?: number
}

export async function POST(req: Request) {
  try {
    // 1. Cek Autentikasi Pengguna
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, fields } = await req.json()

    if (!documentId || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { message: 'Data documentId dan fields (array) wajib diisi' },
        { status: 400 }
      )
    }

    // 2. Cek Apakah Dokumen Ada dan Milik User Ini (Hanya pengirim yang boleh plot TTD)
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    if (document.senderId !== session.user.id) {
      return NextResponse.json(
        { message: 'Hanya pengirim dokumen yang boleh mengatur posisi tanda tangan' },
        { status: 403 }
      )
    }

    // 3. Simpan / Overwrite Fields dalam Transaksi Database
    // Kita hapus plot lama jika ada, lalu masukkan plot koordinat yang baru
    const result = await prisma.$transaction([
      prisma.documentField.deleteMany({
        where: { documentId },
      }),
      prisma.documentField.createMany({
        data: fields.map((field: FieldInput) => ({
          documentId,
          recipientId: field.recipientId,
          pageNumber: field.pageNumber,
          posX: field.posX,
          posY: field.posY,
          width: field.width || 150,
          height: field.height || 60,
        })),
      }),
    ])

    return NextResponse.json(
      {
        message: 'Koordinat frame tanda tangan berhasil disimpan',
        savedFieldsCount: result[1].count,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Save Fields Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}

// Endpoint GET untuk mengambil data field yang sudah tersimpan
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ message: 'documentId diperlukan' }, { status: 400 })
    }

    const fields = await prisma.documentField.findMany({
      where: { documentId },
      include: {
        recipient: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ fields }, { status: 200 })
  } catch (error) {
    console.error('Get Fields Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}