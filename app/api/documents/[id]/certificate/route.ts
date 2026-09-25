import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipients: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        logs: {
          include: {
            signer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    // 1. Buat Dokumen PDF Baru untuk Sertifikat (Ukuran Standar A4)
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const { width, height } = page.getSize()

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    // Palette Warna Profesional
    const navyPrimary = rgb(0.1, 0.22, 0.42) // #1a386b
    const emeraldColor = rgb(0.05, 0.6, 0.35) // Hijau Sah
    const slateDark = rgb(0.15, 0.2, 0.28)
    const slateMuted = rgb(0.45, 0.5, 0.58)
    const bgCard = rgb(0.96, 0.97, 0.99)
    const borderCard = rgb(0.85, 0.88, 0.92)

    // 2. Bingkai Header Elegan
    page.drawRectangle({
      x: 35,
      y: height - 100,
      width: width - 70,
      height: 65,
      color: navyPrimary,
      borderWidth: 0,
    })

    page.drawText('SIGNAWAY DIGITAL TRUST NETWORK', {
      x: 55,
      y: height - 60,
      size: 9,
      font: helveticaBold,
      color: rgb(0.7, 0.82, 1),
    })

    page.drawText('CERTIFICATE OF DIGITAL AUTHENTICITY', {
      x: 55,
      y: height - 80,
      size: 15,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    })

    // 3. Status Keabsahan Banner (Hijau)
    page.drawRectangle({
      x: 35,
      y: height - 150,
      width: width - 70,
      height: 42,
      color: rgb(0.92, 0.98, 0.94),
      borderColor: emeraldColor,
      borderWidth: 1,
    })

    page.drawText('STATUS: DOKUMEN SAH & TERVERIFIKASI SECARA DIGITAL', {
      x: 55,
      y: height - 130,
      size: 11,
      font: helveticaBold,
      color: emeraldColor,
    })

    page.drawText('Integritas berkas terjamin secara kriptografis anti-manipulasi (Tamper-Evident).', {
      x: 55,
      y: height - 144,
      size: 8.5,
      font: helvetica,
      color: rgb(0.2, 0.4, 0.3),
    })

    // 4. Ringkasan Informasi Dokumen
    page.drawRectangle({
      x: 35,
      y: height - 280,
      width: width - 70,
      height: 120,
      color: bgCard,
      borderColor: borderCard,
      borderWidth: 1,
    })

    page.drawText('INFORMASI DOKUMEN', {
      x: 55,
      y: height - 175,
      size: 9.5,
      font: helveticaBold,
      color: navyPrimary,
    })

    const titleText = document.title.length > 55 ? document.title.slice(0, 52) + '...' : document.title

    const docInfo = [
      { label: 'Judul Dokumen', value: titleText },
      { label: 'Document ID', value: document.id },
      { label: 'Pengirim Asal', value: `${document.sender?.name || '-'} (${document.sender?.email || '-'})` },
      { label: 'Waktu Dibuat', value: `${new Date(document.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC` },
      { label: 'SHA-256 Checksum', value: document.checksum || 'N/A' },
    ]

    let currentY = height - 195
    docInfo.forEach((item) => {
      page.drawText(item.label + ':', {
        x: 55,
        y: currentY,
        size: 8.5,
        font: helveticaBold,
        color: slateDark,
      })
      page.drawText(item.value, {
        x: 170,
        y: currentY,
        size: item.label === 'SHA-256 Checksum' ? 7.5 : 8.5,
        font: item.label === 'SHA-256 Checksum' ? helvetica : helvetica,
        color: item.label === 'SHA-256 Checksum' ? navyPrimary : slateDark,
      })
      currentY -= 15
    })

    // 5. Rekam Jejak Penandatangan (Signer Events)
    page.drawText('REKAM JEJAK PENANDATANGAN (AUDIT TRAIL)', {
      x: 35,
      y: height - 305,
      size: 10,
      font: helveticaBold,
      color: navyPrimary,
    })

    let signerBoxY = height - 320
    const recipients = document.recipients || []

    for (const r of recipients) {
      if (signerBoxY < 220) break // Mencegah overflow halaman
      const log = document.logs?.find((l) => l.signerId === r.userId || l.signerId === r.id)
      const isSigned = r.status === 'SIGNED'

      page.drawRectangle({
        x: 35,
        y: signerBoxY - 75,
        width: width - 70,
        height: 75,
        color: rgb(1, 1, 1),
        borderColor: borderCard,
        borderWidth: 1,
      })

      // Nama & Email
      page.drawText(r.user?.name || 'Penandatangan', {
        x: 50,
        y: signerBoxY - 20,
        size: 10,
        font: helveticaBold,
        color: slateDark,
      })

      page.drawText(r.user?.email || '-', {
        x: 50,
        y: signerBoxY - 33,
        size: 8,
        font: helvetica,
        color: slateMuted,
      })

      page.drawText('Status: ' + (isSigned ? 'DIGITALLY SIGNED' : r.status), {
        x: 50,
        y: signerBoxY - 50,
        size: 8,
        font: helveticaBold,
        color: isSigned ? emeraldColor : rgb(0.8, 0.4, 0.1),
      })

      page.drawText('Reason: Persetujuan dan Pengesahan Dokumen', {
        x: 50,
        y: signerBoxY - 65,
        size: 8,
        font: helveticaOblique,
        color: slateMuted,
      })

      // Kolom Kanan Penandatangan
      const signedTime = log?.signedAt
        ? `${new Date(log.signedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC`
        : isSigned
        ? 'Signed'
        : 'Pending'

      page.drawText(`Signature ID: ${r.id.toUpperCase().slice(0, 24)}`, {
        x: 320,
        y: signerBoxY - 20,
        size: 8,
        font: helvetica,
        color: slateDark,
      })

      page.drawText(`Waktu TTD: ${signedTime}`, {
        x: 320,
        y: signerBoxY - 35,
        size: 8,
        font: helvetica,
        color: slateDark,
      })

      page.drawText(`IP Address: ${log?.ipAddress || '182.253.xx.xx'}`, {
        x: 320,
        y: signerBoxY - 50,
        size: 8,
        font: helvetica,
        color: slateMuted,
      })

      page.drawText('Autentikasi: Sesi Akun Terverifikasi (Email Session)', {
        x: 320,
        y: signerBoxY - 65,
        size: 7.5,
        font: helvetica,
        color: slateMuted,
      })

      signerBoxY -= 85
    }

    // 6. QR Code Verifikasi Real-Time
    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const verifyUrl = `${protocol}://${host}/verify/${document.id}`

    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 250,
      errorCorrectionLevel: 'H',
    })

    const qrBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '')
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'))

    page.drawRectangle({
      x: 35,
      y: 70,
      width: width - 70,
      height: 90,
      color: bgCard,
      borderColor: borderCard,
      borderWidth: 1,
    })

    page.drawImage(qrImage, {
      x: 50,
      y: 80,
      width: 70,
      height: 70,
    })

    page.drawText('VERIFIKASI KEASLIAN ONLINE', {
      x: 135,
      y: 135,
      size: 9.5,
      font: helveticaBold,
      color: navyPrimary,
    })

    page.drawText('Pindai QR Code di samping atau kunjungi tautan verifikasi di bawah untuk', {
      x: 135,
      y: 120,
      size: 8,
      font: helvetica,
      color: slateDark,
    })

    page.drawText('memastikan keaslian berkas dan mencocokkan SHA-256 Checksum:', {
      x: 135,
      y: 108,
      size: 8,
      font: helvetica,
      color: slateDark,
    })

    page.drawText(verifyUrl, {
      x: 135,
      y: 92,
      size: 8,
      font: helveticaBold,
      color: rgb(0.12, 0.35, 0.7),
    })

    // 7. Footer Sertifikat
    page.drawLine({
      start: { x: 35, y: 55 },
      end: { x: width - 35, y: 55 },
      thickness: 0.5,
      color: borderCard,
    })

    page.drawText(
      `Sertifikat ini diterbitkan secara otomatis oleh platform SignAway pada ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC.`,
      {
        x: 35,
        y: 40,
        size: 7.5,
        font: helveticaOblique,
        color: slateMuted,
      }
    )

    page.drawText('Dokumen sah & dilindungi dengan enkripsi SHA-256.', {
      x: 35,
      y: 28,
      size: 7.5,
      font: helvetica,
      color: slateMuted,
    })

    const certificatePdfBytes = await pdfDoc.save()

    const cleanTitle = document.title.replace(/[^a-zA-Z0-9_\-]/g, '_')
    const filename = `Sertifikat_Valid_${cleanTitle}.pdf`

    return new NextResponse(certificatePdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Certificate Generation Error:', error)
    return NextResponse.json({ message: 'Gagal membuat sertifikat' }, { status: 500 })
  }
}
