import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ message: 'File PDF tidak ditemukan' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Hitung SHA-256 dari PDF yang diunggah
    const uploadedHash = crypto.createHash('sha256').update(buffer).digest('hex')

    // Cari Dokumen yang memiliki checksum cocok di database
    const document = await prisma.document.findFirst({
      where: { checksum: uploadedHash },
      include: {
        sender: { select: { name: true, email: true } },
        recipients: { include: { user: { select: { name: true, email: true } } } },
        logs: true,
      },
    })

    if (!document) {
      return NextResponse.json(
        {
          isValid: false,
          message: 'Dokumen tidak terverifikasi! Berkas ini telah diubah, dikonversi, atau tidak terdaftar.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        isValid: true,
        documentId: document.id,
        title: document.title,
        createdAt: document.createdAt,
        status: document.status,
        checksum: document.checksum,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Verify Upload Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}