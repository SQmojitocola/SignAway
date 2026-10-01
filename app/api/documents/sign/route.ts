import { NextResponse } from 'next/server'
import { PDFDocument, PDFImage, rgb, StandardFonts } from 'pdf-lib'
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

    const currentUserId = userId

    // Cek apakah user adalah penerima asli yang sedang menunggu giliran tanda tangan
    let recipient = document.recipients.find(
      (r) => r.userId === currentUserId && (r.status === 'WAITING' || r.status === 'PENDING')
    )

    // Cek apakah ada pengajuan proxy APPROVED di mana pemohonnya adalah user yang sedang login
    const approvedProxy = await prisma.proxySignRequest.findFirst({
      where: {
        documentId: document.id,
        requestedById: currentUserId,
        status: 'APPROVED',
      },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            nip: true,
            department: true,
          },
        },
      },
    })

    // Jika user bukan penerima asli langsung, namun memiliki izin proxy APPROVED,
    // ambil antrean recipient milik targetUser yang diwakilinya
    if (!recipient && approvedProxy) {
      recipient = document.recipients.find(
        (r) => r.userId === approvedProxy.targetUserId && (r.status === 'WAITING' || r.status === 'PENDING')
      )
    }

    const isOriginalRecipient = recipient ? recipient.userId === currentUserId : false
    const isApprovedProxy = Boolean(
      approvedProxy && recipient && approvedProxy.targetUserId === recipient.userId
    )

    if (!recipient || (!isOriginalRecipient && !isApprovedProxy)) {
      return NextResponse.json(
        { message: 'Anda tidak memiliki hak menandatangani plot ini.' },
        { status: 403 }
      )
    }

    const fields = document.fields.filter((field) => field.recipientId === recipient.id)
    if (fields.length === 0) {
      return NextResponse.json({ message: 'Plot TTD/Paraf belum ditentukan' }, { status: 400 })
    }

    // Ambil profil lengkap penandatangan aktual saat ini
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true, nip: true },
    })

    const signedAt = new Date()

    const cleanRelativePath = document.filePath.replace(/^\//, '')
    const absolutePdfPath = path.join(process.cwd(), 'public', cleanRelativePath)
    const pdfBytes = await readFile(absolutePdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Cache image embedding agar gambar spesimen yang sama tidak di-embed berulang kali
    const embeddedImageCache: Record<string, PDFImage> = {}

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

    // Embed font standard Helvetica & HelveticaBold untuk plot Teks Identitas dan Stempel Audit
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Embed watermark image (public/assets/watermark.png)
    let embeddedWatermark: PDFImage | null = null
    try {
      const watermarkPath = path.join(process.cwd(), 'public', 'assets', 'watermark.png')
      const watermarkBytes = await readFile(watermarkPath)
      embeddedWatermark = await pdfDoc.embedPng(watermarkBytes)
    } catch (wmErr) {
      console.error('Failed to load watermark image:', wmErr)
    }

    const effectiveSigner = isApprovedProxy && approvedProxy?.targetUser ? approvedProxy.targetUser : currentUser

    // 📍 1. STAMPING MASING-MASING FIELD DENGAN SPESIMEN YANG SESUAI (TTD vs PARAF vs NAMA & NIK)
    for (const field of fields) {
      const pageNum = field.pageNumber || 1
      const pageIndex = Math.max(0, pageNum - 1)
      const page = pdfDoc.getPage(pageIndex)
      const pageHeight = page.getHeight()

      // Konversi Visual Scale (1.25) ke PDF Scale (1.0)
      const boxX = field.posX / 1.25
      const boxY = field.posY / 1.25
      const boxWidth = (field.width || (field.type === 'NAME' ? 160 : 150)) / 1.25
      const boxHeight = (field.height || (field.type === 'NAME' ? 48 : 70)) / 1.25

      // 🏷️ CETAK TEKS IDENTITAS RESMI (NAMA BERGARIS BAWAH & NIK TANPA AWALAN)
      if (field.type === 'NAME') {
        const nameText = (effectiveSigner?.name || 'PENANDATANGAN').toUpperCase()
        const nipText = effectiveSigner?.nip ? String(effectiveSigner.nip).trim() : ''
        const baseFontSize = (field.fontSize || 10) * 0.95
        const nameFontSize = baseFontSize
        const nipFontSize = Math.max(6.5, baseFontSize * 0.8)

        const nameWidth = helveticaBold.widthOfTextAtSize(nameText, nameFontSize)
        const isCenter = (field.textAlign || 'center') === 'center'
        const centerY = pageHeight - boxY - boxHeight / 2

        const underlineThickness = Math.max(0.7, (nameFontSize / 12) * 0.75)
        const underlineGap = Math.max(1.8, nameFontSize * 0.15)
        const lineSpacing = Math.max(3, nameFontSize * 0.25)

        if (nipText) {
          const nipWidth = helvetica.widthOfTextAtSize(nipText, nipFontSize)
          const nameX = isCenter ? boxX + (boxWidth - nameWidth) / 2 : boxX + 2
          const totalTextHeight = nameFontSize + lineSpacing + nipFontSize
          const nameY = centerY + (totalTextHeight / 2) - nameFontSize * 0.75

          // Teks Nama Penandatangan (Kapital Tebal)
          page.drawText(nameText, {
            x: nameX,
            y: nameY,
            size: nameFontSize,
            font: helveticaBold,
            color: rgb(0, 0, 0),
          })

          // Garis Bawah (Underline) Nama
          const underlineY = nameY - underlineGap
          page.drawLine({
            start: { x: nameX, y: underlineY },
            end: { x: nameX + nameWidth, y: underlineY },
            thickness: underlineThickness,
            color: rgb(0, 0, 0),
          })

          // Teks NIK Penandatangan (Angka saja di bawah nama)
          const nipX = isCenter ? boxX + (boxWidth - nipWidth) / 2 : boxX + 2
          const nipY = underlineY - lineSpacing - (nipFontSize * 0.75)
          page.drawText(nipText, {
            x: nipX,
            y: nipY,
            size: nipFontSize,
            font: helvetica,
            color: rgb(0.1, 0.1, 0.1),
          })
        } else {
          // Hanya Nama saja jika tidak ada NIP
          const nameX = isCenter ? boxX + (boxWidth - nameWidth) / 2 : boxX + 2
          const nameY = centerY - (nameFontSize * 0.35)

          page.drawText(nameText, {
            x: nameX,
            y: nameY,
            size: nameFontSize,
            font: helveticaBold,
            color: rgb(0, 0, 0),
          })

          const underlineY = nameY - underlineGap
          page.drawLine({
            start: { x: nameX, y: underlineY },
            end: { x: nameX + nameWidth, y: underlineY },
            thickness: underlineThickness,
            color: rgb(0, 0, 0),
          })
        }
        continue
      }

      // Prioritaskan spesimen dari signaturesMap per field ID, jika tidak ada baru gunakan fallback
      const rawImageBase64 = (signaturesMap && signaturesMap[field.id]) || fallbackSignatureBase64

      if (!rawImageBase64) continue

      const embeddedImage = await getEmbeddedImage(rawImageBase64)

      // Aspect Ratio Protection
      const scale = Math.min(boxWidth / embeddedImage.width, boxHeight / embeddedImage.height)
      const drawWidth = embeddedImage.width * scale
      const drawHeight = embeddedImage.height * scale

      const drawX = boxX + (boxWidth - drawWidth) / 2
      const drawY = pageHeight - boxY - boxHeight + (boxHeight - drawHeight) / 2

      // 🏷️ JIKA FIELD MERUPAKAN TTD (SIGNATURE), CETAK WATERMARK SESUAI OPSI (OPSI 1, OPSI 2, ATAU NONE)
      if (embeddedWatermark && field.type === 'SIGNATURE' && field.textAlign !== 'none') {
        if (field.textAlign === 'corner') {
          // Opsi 2: Watermark tajam (opacity 1.0), kecil di pojok kanan bawah TTD
          const cornerH = Math.min(13, boxHeight * 0.25)
          const cornerW = cornerH * (embeddedWatermark.width / embeddedWatermark.height)
          const cornerX = boxX + boxWidth - cornerW - 2
          const cornerY = pageHeight - boxY - boxHeight + 2

          page.drawImage(embeddedWatermark, {
            x: cornerX,
            y: cornerY,
            width: cornerW,
            height: cornerH,
            opacity: 1.0,
          })
        } else {
          // Opsi 1: Watermark pudar 20% (opacity 0.2), center di belakang TTD
          const wmScale = Math.min((boxWidth * 0.75) / embeddedWatermark.width, (boxHeight * 0.65) / embeddedWatermark.height)
          const wmW = embeddedWatermark.width * wmScale
          const wmH = embeddedWatermark.height * wmScale
          const wmX = boxX + (boxWidth - wmW) / 2
          const wmY = pageHeight - boxY - boxHeight + (boxHeight - wmH) / 2

          page.drawImage(embeddedWatermark, {
            x: wmX,
            y: wmY,
            width: wmW,
            height: wmH,
            opacity: 0.2, // Turun hingga 20%
          })
        }
      }

      // TEMPELKAN GAMBAR (Transparan di atas teks/garis dokumen & di atas watermark)
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

    // 📍 3. STAMPING STEMPEL AUDIT & QR VERIFIKASI (OPSI 3 - POSISI FLEKSIBEL SESUAI PLOT)
    const totalPages = pdfDoc.getPageCount()
    const auditField = document.fields.find((f) => f.type === 'AUDIT_STAMP')

    if (auditField) {
      const targetPageIndex = Math.max(0, Math.min(totalPages - 1, (auditField.pageNumber || 1) - 1))
      const boxX = auditField.posX / 1.25
      const boxY = auditField.posY / 1.25
      const boxWidth = (auditField.width || 210) / 1.25
      const boxHeight = (auditField.height || 65) / 1.25

      const stampPage = pdfDoc.getPage(targetPageIndex)
      const { width: pageWidth, height: pageHeight } = stampPage.getSize()

      // Safety clamping: pastikan koordinat box selalu berada di dalam batas fisik halaman PDF
      const clampedBoxX = Math.max(10, Math.min(pageWidth - boxWidth - 10, boxX))
      const clampedBoxY = Math.max(10, Math.min(pageHeight - boxHeight - 10, boxY))
      const drawY = pageHeight - clampedBoxY - boxHeight

      // A. Gambar Kotak Putih dengan Border Halus (Sesuai Desain Opsi 3)
      stampPage.drawRectangle({
        x: clampedBoxX,
        y: drawY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.8, 0.83, 0.88),
        borderWidth: 0.8,
      })

      // B. Tempel QR Code di Sisi Kiri Kotak (Mengarahkan ke halaman verifikasi dokumen)
      const qrPadding = 5
      const qrSize = Math.max(20, boxHeight - qrPadding * 2)
      stampPage.drawImage(embeddedQrImage, {
        x: clampedBoxX + qrPadding,
        y: drawY + qrPadding,
        width: qrSize,
        height: qrSize,
      })

      // C. Tempel Logo E-Sign Terverifikasi di Sisi Kanan Kotak (Sesuai Desain Opsi 3)
      if (embeddedWatermark) {
        const availW = boxWidth - qrSize - qrPadding * 3
        const availH = boxHeight - qrPadding * 2
        const wmScale = Math.min(availW / embeddedWatermark.width, availH / embeddedWatermark.height)
        const wmW = embeddedWatermark.width * wmScale
        const wmH = embeddedWatermark.height * wmScale
        const wmX = clampedBoxX + qrPadding + qrSize + qrPadding + (availW - wmW) / 2
        const wmY = drawY + (boxHeight - wmH) / 2

        stampPage.drawImage(embeddedWatermark, {
          x: wmX,
          y: wmY,
          width: wmW,
          height: wmH,
          opacity: 1.0,
        })
      }
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
          signatureImagePath: isApprovedProxy && approvedProxy
            ? `PROXY:${approvedProxy.targetUserId}:${approvedProxy.approvedById || 'ADMIN'}`
            : 'embedded_in_pdf',
          ipAddress: clientIp,
          signedAt,
        },
      })

      const remainingWaiters = await tx.documentRecipient.count({
        where: { documentId: document.id, status: { not: 'SIGNED' } },
      })

      if (remainingWaiters > 0) {
        const nextPendingRecipient = await tx.documentRecipient.findFirst({
          where: {
            documentId: document.id,
            status: 'PENDING',
          },
          orderBy: { signingOrder: 'asc' },
        })
        if (nextPendingRecipient) {
          await tx.documentRecipient.update({
            where: { id: nextPendingRecipient.id },
            data: { status: 'WAITING' },
          })
        }
      }

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