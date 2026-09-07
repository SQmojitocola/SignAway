import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    // 1. Verifikasi Session Login
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, signatureImageBase64 } = await req.json()

    if (!documentId || !signatureImageBase64) {
      return NextResponse.json(
        { message: 'documentId dan signatureImageBase64 wajib diisi' },
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
      (r) => r.userId === session.user.id && r.status === 'WAITING'
    )

    if (!recipient) {
      return NextResponse.json(
        { message: 'Kamu tidak memiliki antrean TTD pada dokumen ini' },
        { status: 403 }
      )
    }

    // 4. Cari Koordinat Field TTD untuk Recipient Ini
    const field = document.fields.find((f) => f.recipientId === recipient.id)
    if (!field) {
      return NextResponse.json(
        { message: 'Plot koordinat TTD belum ditentukan oleh pengirim' },
        { status: 400 }
      )
    }

    // 5. Buka File PDF dari Storage Lokal
    const absolutePdfPath = path.join(process.cwd(), 'public', document.filePath)
    const pdfBytes = await readFile(absolutePdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // 6. Embed Gambar TTD (Base64 PNG) ke Halaman PDF yang Sesuai
    const base64Data = signatureImageBase64.replace(/^data:image\/png;base64,/, '')
    const signatureImageBytes = Buffer.from(base64Data, 'base64')
    const embeddedImage = await pdfDoc.embedPng(signatureImageBytes)

    const pageIndex = field.pageNumber - 1 // pdf-lib menggunakan indeks berbasis 0
    const page = pdfDoc.getPage(pageIndex)

    // Tempelkan gambar sesuai koordinat pos_x dan pos_y
    page.drawImage(embeddedImage, {
      x: field.posX,
      y: field.posY,
      width: field.width,
      height: field.height,
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

      // Simpan Audit Log
      await tx.signatureLog.create({
        data: {
          documentId: document.id,
          signerId: session.user.id,
          signatureImagePath: 'embedded_in_pdf',
          ipAddress: clientIp,
        },
      })

      // Cek apakah semua recipient sudah TTD
      const remainingWaiters = await tx.documentRecipient.count({
        where: { documentId: document.id, status: 'WAITING' },
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
  } catch (error) {
    console.error('PDF Stamping Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}