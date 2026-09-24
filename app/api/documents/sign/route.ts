import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import QRCode from 'qrcode'
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
    
    // 📍 Ambil signaturesMap (multi-plot per field ID) atau fallback single signature
    const signaturesMap: Record<string, string> | undefined = body.signaturesMap
    const fallbackSignatureBase64: string | undefined = body.signatureImageBase64 || body.signatureData

    // Validasi input
    if (!documentId) {
      return NextResponse.json({ message: 'documentId wajib diisi' }, { status: 400 })
    }

    if (!fallbackSignatureBase64 && (!signaturesMap || Object.keys(signaturesMap).length === 0)) {
      return NextResponse.json(
        { message: 'Silakan lengkapi tanda tangan / paraf sebelum mengirim.' },
        { status: 400 }
      )
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { recipients: { include: { user: true } }, fields: true },
    })

    if (!document) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    const recipient = document.recipients.find(
      (r) => r.userId === userId && (r.status === 'WAITING' || r.status === 'PENDING')
    )

    if (!recipient) {
      return NextResponse.json({ message: 'Kamu tidak memiliki antrean TTD pada dokumen ini' }, { status: 403 })
    }

    const fields = document.fields.filter((field) => field.recipientId === recipient.id)
    if (fields.length === 0) {
      return NextResponse.json({ message: 'Plot TTD/Paraf belum ditentukan' }, { status: 400 })
    }

    const cleanRelativePath = document.filePath.replace(/^\//, '')
    const absolutePdfPath = path.join(process.cwd(), 'public', cleanRelativePath)
    const pdfBytes = await readFile(absolutePdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Cache image embedding agar gambar spesimen yang sama tidak di-embed berulang kali
    const embeddedImageCache: Record<string, any> = {}

    // Helper function untuk mendapatkan PDFImage dari string base64
    const getEmbeddedImage = async (base64Str: string) => {
      if (embeddedImageCache[base64Str]) {
        return embeddedImageCache[base64Str]
      }
      const cleanBase64 = base64Str.replace(/^data:image\/png;base64,/, '')
      const imageBytes = Buffer.from(cleanBase64, 'base64')
      const embedded = await pdfDoc.embedPng(imageBytes)
      embeddedImageCache[base64Str] = embedded
      return embedded
    }

    // 📍 1. STAMPING MASING-MASING FIELD DENGAN SPESIMEN YANG SESUAI (TTD vs PARAF)
    for (const field of fields) {
      // Prioritaskan spesimen dari signaturesMap per field ID, jika tidak ada baru gunakan fallback
      const rawImageBase64 = (signaturesMap && signaturesMap[field.id]) || fallbackSignatureBase64

      if (!rawImageBase64) continue

      const embeddedImage = await getEmbeddedImage(rawImageBase64)

      const pageNum = field.pageNumber || 1
      const pageIndex = Math.max(0, pageNum - 1)
      const page = pdfDoc.getPage(pageIndex)
      const pageHeight = page.getHeight()

      // Konversi Visual Scale (1.25) ke PDF Scale (1.0)
      const boxX = field.posX / 1.25
      const boxY = field.posY / 1.25
      const boxWidth = (field.width || 150) / 1.25
      const boxHeight = (field.height || 70) / 1.25

      // Aspect Ratio Protection
      const scale = Math.min(boxWidth / embeddedImage.width, boxHeight / embeddedImage.height)
      const drawWidth = embeddedImage.width * scale
      const drawHeight = embeddedImage.height * scale

      const drawX = boxX + (boxWidth - drawWidth) / 2
      const drawY = pageHeight - boxY - boxHeight + (boxHeight - drawHeight) / 2

      // TEMPELKAN GAMBAR (Transparan di atas teks/garis dokumen)
      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      })
    }

    // 📍 2. GENERATE QR CODE HIGH-RESOLUTION ANTI-PECAH (400px)
    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const verifyUrl = `${protocol}://${host}/verify/${document.id}`

    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 400, // Dimensi sumber piksel tinggi untuk efek Retina Display
      errorCorrectionLevel: 'H',
    })

    const qrBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '')
    const embeddedQrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'))

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // 📍 3. STAMPING FOOTER MODERN DI SETIAP HALAMAN PDF
    const totalPages = pdfDoc.getPageCount()
    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i)
      const { width } = page.getSize()

      // Garis Pembatas Tipis Footer
      page.drawLine({
        start: { x: 30, y: 42 },
        end: { x: width - 30, y: 42 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.92),
      })

      // Tempel QR Code Tajam & Proporsional (Ukuran 32x32 pt)
      page.drawImage(embeddedQrImage, {
        x: 30,
        y: 7,
        width: 32,
        height: 32,
      })

      // Teks Kiri: SHA-256 Audit Trail
      page.drawText('SHA-256 Audit Trail Verified', {
        x: 70,
        y: 22,
        size: 7.5,
        font: helveticaBold,
        color: rgb(0.05, 0.6, 0.35), // Warna Hijau Pudar Terverifikasi
      })

      page.drawText('• Dokumen sah & terdaftar secara digital', {
        x: 182,
        y: 22,
        size: 7.5,
        font: helvetica,
        color: rgb(0.5, 0.55, 0.6),
      })

      // Teks Kanan: DOC-ID
      const docIdText = `DOC-ID: ${document.id.toUpperCase().slice(0, 18)}`
      const docIdWidth = helveticaBold.widthOfTextAtSize(docIdText, 7.5)

      page.drawText(docIdText, {
        x: width - 30 - docIdWidth,
        y: 22,
        size: 7.5,
        font: helveticaBold,
        color: rgb(0.4, 0.45, 0.5),
      })
    }

    // 📍 4. HITUNG HASH SHA-256 KRIPTOGRAFI DOKUMEN FINAL
    const updatedPdfBytes = await pdfDoc.save()
    const finalDocumentHash = crypto.createHash('sha256').update(updatedPdfBytes).digest('hex')

    await writeFile(absolutePdfPath, updatedPdfBytes)

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1'

    await prisma.$transaction(async (tx) => {
      await tx.documentRecipient.update({
        where: { id: recipient.id },
        data: { status: 'SIGNED' },
      })

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
        data: {
          status: newDocStatus,
          checksum: finalDocumentHash,
        },
      })
    })

    return NextResponse.json({ message: 'Tanda tangan & stempel footer berhasil ditambahkan' }, { status: 200 })
  } catch (error) {
    console.error('PDF Stamping Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}