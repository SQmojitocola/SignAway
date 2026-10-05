import { prisma } from '../lib/prisma'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

async function testStamping() {
  const document = await prisma.document.findFirst({
    include: { recipients: true, fields: true },
  })

  if (!document || document.fields.length === 0) {
    console.error('❌ Data dokumen atau field belum siap. Jalankan test upload dan field dulu!')
    return
  }

  const field = document.fields[0]
  const absolutePdfPath = path.join(process.cwd(), 'public', document.filePath)

  // Buat dummy gambar PNG 1x1 piksel
  const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const imageBytes = Buffer.from(dummyPngBase64, 'base64')

  const pdfBytes = fs.readFileSync(absolutePdfPath)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const embeddedImage = await pdfDoc.embedPng(imageBytes)

  const page = pdfDoc.getPage(field.pageNumber - 1)
  page.drawImage(embeddedImage, {
    x: field.posX,
    y: field.posY,
    width: field.width,
    height: field.height,
  })

  const updatedPdf = await pdfDoc.save()
  fs.writeFileSync(absolutePdfPath, updatedPdf)

  console.log('✅ UJI STAMPING PDF SUKSES!')
  console.log('File PDF telah ter-update di:', absolutePdfPath)
}

testStamping()
  .catch(console.error)
  .finally(() => prisma.$disconnect())