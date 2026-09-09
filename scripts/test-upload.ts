import { prisma } from '../lib/prisma'
import fs from 'fs'
import path from 'path'

async function testUpload() {
  // 1. Ambil 2 User dari Database untuk Testing
  const users = await prisma.user.findMany({ take: 2 })
  if (users.length < 1) {
    console.error('❌ Belum ada User di database. Jalankan API Register dulu!')
    return
  }

  const sender = users[0]
  const recipientIds = users.map((u) => u.id) // Pengirim & Penerima

  // 2. Buat Dummy File PDF sederhana (Buffer)
  const dummyPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF'
  )
  const pdfBase64 = `data:application/pdf;base64,${dummyPdfBuffer.toString('base64')}`

  // 3. Simpan langsung ke Database via Prisma (Menyimulasikan alur API)
  const fileName = `test-${Date.now()}.pdf`
  const filePath = path.join(process.cwd(), 'public/uploads', fileName)
  const publicUrl = `/uploads/${fileName}`

  // Tulis file fisik ke public/uploads
  fs.writeFileSync(filePath, dummyPdfBuffer)

  const newDoc = await prisma.document.create({
    data: {
      title: 'Dokumen Testing MVP',
      filePath: publicUrl,
      senderId: sender.id,
      status: 'DRAFT',
      recipients: {
        create: recipientIds.map((id) => ({
          userId: id,
          role: 'SIGNER',
          status: 'WAITING',
        })),
      },
    },
    include: { recipients: true },
  })

  console.log('✅ UJI UPLOAD SUKSES!')
  console.log('Dokumen ID:', newDoc.id)
  console.log('File tersimpan di:', filePath)
}

testUpload()
  .catch(console.error)
  .finally(() => prisma.$disconnect())