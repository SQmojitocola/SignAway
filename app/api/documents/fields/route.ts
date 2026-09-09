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

    const { documentId, fields, send = false } = await req.json()

    if (!documentId || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { message: 'Data documentId dan fields (array) wajib diisi' },
        { status: 400 }
      )
    }

    // 2. Cek Apakah Dokumen Ada dan Milik User Ini (Hanya pengirim yang boleh plot TTD)
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { recipients: true },
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

    const hasSelfFields = fields.some((field: FieldInput) => field.recipientId === 'self')
    let selfRecipientId: string | null = null
    if (hasSelfFields) {
      const selfRecipient = await prisma.documentRecipient.findFirst({
        where: { documentId, userId: document.senderId },
        select: { id: true },
      })
      selfRecipientId = selfRecipient?.id ?? (
        await prisma.documentRecipient.create({
          data: { documentId, userId: document.senderId, role: 'SIGNER' },
          select: { id: true },
        })
      ).id
    }

    const normalizedFields = fields.map((field: FieldInput) => ({
      documentId,
      recipientId: field.recipientId === 'self' && selfRecipientId
        ? selfRecipientId
        : field.recipientId,
      pageNumber: field.pageNumber,
      posX: field.posX,
      posY: field.posY,
      width: field.width || 150,
      height: field.height || 60,
    }))

    if (send) {
      const externalRecipients = document.recipients.filter(
        (recipient) => recipient.userId !== document.senderId
      )
      const incompleteRecipient = externalRecipients.find(
        (recipient) => !normalizedFields.some((field) => field.recipientId === recipient.id)
      )
      if (incompleteRecipient) {
        return NextResponse.json(
          { message: 'Setiap resipien harus memiliki minimal satu field tanda tangan' },
          { status: 400 }
        )
      }
    }

    // 3. Simpan / Overwrite Fields dalam Transaksi Database
    // Kita hapus plot lama jika ada, lalu masukkan plot koordinat yang baru
    const result = await prisma.$transaction(async (tx) => {
      await tx.documentField.deleteMany({ where: { documentId } })
      const createdFields = await tx.documentField.createMany({ data: normalizedFields })

      if (send) {
        await tx.document.update({ where: { id: documentId }, data: { status: 'PENDING' } })
        if (document.sequential) {
          await Promise.all(document.recipients.map((recipient) =>
            tx.documentRecipient.update({
              where: { id: recipient.id },
              data: { status: recipient.signingOrder === 1 ? 'WAITING' : 'PENDING' },
            })
          ))
        } else {
          await tx.documentRecipient.updateMany({
            where: { documentId },
            data: { status: 'WAITING' },
          })
        }
      }

      return createdFields
    })

    return NextResponse.json(
      {
        message: 'Koordinat frame tanda tangan berhasil disimpan',
        savedFieldsCount: result.count,
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