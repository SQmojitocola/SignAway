import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    // 1. Cek Sesi Login User
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.json()
    const { title, pdfBase64, recipientIds } = formData

    if (!title || !pdfBase64 || !recipientIds || !Array.isArray(recipientIds)) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 })
    }

    // 2. Simpan File PDF ke public/uploads
    const buffer = Buffer.from(pdfBase64.split(',')[1] || pdfBase64, 'base64')
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`
    const filePath = path.join(process.cwd(), 'public/uploads', fileName)
    const publicUrl = `/uploads/${fileName}`

    await writeFile(filePath, buffer)

    // 3. Simpan Transaksi Dokumen & Recipients ke Database via Prisma
    const newDocument = await prisma.document.create({
      data: {
        title,
        filePath: publicUrl,
        fileSize: buffer.length,
        senderId: session.user.id,
        status: 'DRAFT',
        recipients: {
          create: recipientIds.map((userId: string) => ({
            userId,
            status: 'WAITING',
          })),
        },
      },
      include: {
        recipients: true,
      },
    })

    return NextResponse.json(
      { message: 'Dokumen berhasil diunggah', document: newDocument },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}