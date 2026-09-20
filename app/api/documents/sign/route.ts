import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const documentId = body.documentId
    const signatureImageBase64 = body.signatureImageBase64 || body.signatureData

    if (!documentId || !signatureImageBase64) {
      return NextResponse.json(
        { message: 'documentId dan signatureData wajib diisi' },
        { status: 400 }
      )
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { recipients: true, fields: true },
    })

    if (!document) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    const recipient = document.recipients.find(
      (r) => r.userId === userId && (r.status === 'WAITING' || r.status === 'PENDING')
    )

    if (!recipient) {
      return NextResponse.json(
        { message: 'Kamu tidak memiliki antrean TTD pada dokumen ini' },
        { status: 403 }
      )
    }

    const fields = document.fields.filter((field) => field.recipientId === recipient.id)
    if (fields.length === 0) {
      return NextResponse.json(
        { message: 'Plot koordinat TTD belum ditentukan oleh pengirim' },
        { status: 400 }
      )
    }

    const cleanRelativePath = document.filePath.replace(/^\//, '')
    const absolutePdfPath = path.join(process.cwd(), 'public', cleanRelativePath)
    const pdfBytes = await readFile(absolutePdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)

    const base64Data = signatureImageBase64.replace(/^data:image\/png;base64,/, '')
    const signatureImageBytes = Buffer.from(base64Data, 'base64')
    const embeddedImage = await pdfDoc.embedPng(signatureImageBytes)

    fields.forEach((field: any) => {
      const pageNum = field.pageNumber || 1
      const pageIndex = Math.max(0, pageNum - 1)
      const page = pdfDoc.getPage(pageIndex)

      const pageHeight = page.getHeight()

      // 📍 Data di DB sudah skala 1.0, tinggal gunakan langsung
      const realX = field.posX
      const realY = field.posY
      const realWidth = field.width || 120
      const realHeight = field.height || 56

      // 📍 Balik sumbu Y karena PDF-lib berpatokan dari KIRI-BAWAH
      const drawX = realX
      const drawY = pageHeight - realY - realHeight

      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: realWidth,
        height: realHeight,
      })
    })

    const updatedPdfBytes = await pdfDoc.save()
    await writeFile(absolutePdfPath, updatedPdfBytes)

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1'

    await prisma.$transaction(async (tx) => {
      await tx.documentRecipient.update({
        where: { id: recipient.id },
        data: { status: 'SIGNED' },
      })

      if (document.sequential && recipient.signingOrder !== null) {
        const nextRecipient = document.recipients.find(
          (candidate) => candidate.signingOrder === (recipient.signingOrder as number) + 1
        )
        if (nextRecipient) {
          await tx.documentRecipient.update({
            where: { id: nextRecipient.id },
            data: { status: 'WAITING' },
          })
        }
      }

      await tx.signatureLog.create({
        data: {
          documentId: document.id,
          signerId: userId,
          signatureImagePath: 'embedded_in_pdf',
          ipAddress: clientIp,
        },
      })

      const remainingWaiters = await tx.documentRecipient.count({
        where: { documentId: document.id, status: { not: 'SIGNED' } },
      })

      const newDocStatus = remainingWaiters === 0 ? 'COMPLETED' : 'PARTIAL_SIGNED'

      await tx.document.update({
        where: { id: document.id },
        data: { status: newDocStatus },
      })
    })

    return NextResponse.json({ message: 'Tanda tangan berhasil ditempelkan pada PDF' }, { status: 200 })
  } catch (error: unknown) {
    console.error('PDF Stamping Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}