import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const PDF_VIEWPORT_SCALE = 1.25

export async function POST(req: Request) {
  try {
    // 1. Verifikasi Session Login
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    // Mendukung nama variabel dari frontend (signatureData atau signatureImageBase64)
    const documentId = body.documentId
    const signatureImageBase64 = body.signatureImageBase64 || body.signatureData

    if (!documentId || !signatureImageBase64) {
      return NextResponse.json(
        { message: 'documentId dan signatureData wajib diisi' },
        { status: 400 }
      )
    }

    // 2. Ambil Data Dokumen, Recipients, dan Fields dari Database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        recipients: true,
        fields: true,
      },
    })

    if (!document) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    // 3. Cek Apakah User Merupakan Recipient yang Berhak
    const recipient = document.recipients.find(
      (r) => r.userId === userId && (r.status === 'WAITING' || r.status === 'PENDING')
    )

    const assignedRecipient = document.recipients.find((r) => r.userId === userId)
    if (document.sequential && assignedRecipient?.status === 'PENDING') {
      return NextResponse.json(
        { message: 'Belum giliran kamu untuk menandatangani dokumen ini' },
        { status: 409 }
      )
    }

    if (!recipient) {
      return NextResponse.json(
        { message: 'Kamu tidak memiliki antrean TTD pada dokumen ini' },
        { status: 403 }
      )
    }

    // 4. Cari Koordinat Field TTD untuk Recipient Ini
    const fields = document.fields.filter((field) => field.recipientId === recipient.id)
    if (fields.length === 0) {
      return NextResponse.json(
        { message: 'Plot koordinat TTD belum ditentukan oleh pengirim' },
        { status: 400 }
      )
    }

    // 5. Buka File PDF dari Storage Lokal
    const cleanRelativePath = document.filePath.replace(/^\//, '')
    const absolutePdfPath = path.join(process.cwd(), 'public', cleanRelativePath)
    const pdfBytes = await readFile(absolutePdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // 6. Embed Gambar TTD (Base64 PNG) ke Halaman PDF yang Sesuai
    const base64Data = signatureImageBase64.replace(/^data:image\/png;base64,/, '')
    const signatureImageBytes = Buffer.from(base64Data, 'base64')
    const embeddedImage = await pdfDoc.embedPng(signatureImageBytes)

    fields.forEach((field) => {
      // Menentukan indeks halaman (default ke halaman 1 jika tidak diset)
      const pageNum = field.pageNumber || field.page || 1
      const pageIndex = Math.max(0, pageNum - 1)
      const page = pdfDoc.getPage(pageIndex)

      const pageWidth = page.getWidth()
      const pageHeight = page.getHeight()

      const toPercent = (value: number, pageSize: number) => {
        if (value <= 0) return 0
        return value > 100 ? (value / pageSize) * 100 : value
      }

      const xPercent = field.xPercent ?? toPercent(field.posX, pageWidth)
      const yPercent = field.yPercent ?? toPercent(field.posY, pageHeight)
      const widthPercent = field.widthPercent ?? toPercent(field.width, pageWidth)
      const heightPercent = field.heightPercent ?? toPercent(field.height, pageHeight)

      const drawWidth = (widthPercent / 100) * pageWidth
      const drawHeight = (heightPercent / 100) * pageHeight
      const drawX = (xPercent / 100) * pageWidth

      // Dibalik karena sumbu Y pada pdf-lib dimulai dari KIRI-BAWAH
      const drawY = pageHeight - (yPercent / 100) * pageHeight - drawHeight

      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      })
    })

    // 7. Simpan Perubahan PDF
    const updatedPdfBytes = await pdfDoc.save()
    await writeFile(absolutePdfPath, updatedPdfBytes)

    // 8. Update Status di Database & Catat Audit Log dalam Transaksi
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1'

    await prisma.$transaction(async (tx) => {
      // Update status recipient
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

      // Simpan Audit Log
      await tx.signatureLog.create({
        data: {
          documentId: document.id,
          signerId: userId,
          signatureImagePath: 'embedded_in_pdf',
          ipAddress: clientIp,
        },
      })

      // Cek apakah seluruh recipient sudah menandatangani
      const remainingWaiters = await tx.documentRecipient.count({
        where: { documentId: document.id, status: { not: 'SIGNED' } },
      })

      const newDocStatus = remainingWaiters === 0 ? 'COMPLETED' : 'PARTIAL_SIGNED'

      await tx.document.update({
        where: { id: document.id },
        data: { status: newDocStatus },
      })
    })

    return NextResponse.json(
      { message: 'Tanda tangan berhasil ditempelkan pada PDF' },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('PDF Stamping Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { message: 'Internal Server Error', error: message },
      { status: 500 }
    )
  }
}