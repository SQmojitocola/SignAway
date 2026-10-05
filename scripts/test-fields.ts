import { prisma } from '../lib/prisma'

async function testSaveFields() {
  // 1. Ambil Dokumen & Recipient Pertama dari Database
  const doc = await prisma.document.findFirst({
    include: { recipients: true },
  })

  if (!doc || doc.recipients.length === 0) {
    console.error('❌ Tidak ada dokumen atau recipient. Jalankan test upload dulu!')
    return
  }

  const recipient = doc.recipients[0]

  // 2. Simulasi Plot 2 Kotak TTD (Halaman 1 dan Halaman 2)
  const dummyFields = [
    {
      recipientId: recipient.id,
      pageNumber: 1,
      posX: 120.5,
      posY: 350.0,
      width: 150,
      height: 60,
    },
    {
      recipientId: recipient.id,
      pageNumber: 2,
      posX: 200.0,
      posY: 500.0,
      width: 150,
      height: 60,
    },
  ]

  // Simpan ke database via Prisma
  await prisma.documentField.deleteMany({ where: { documentId: doc.id } })
  await prisma.documentField.createMany({
    data: dummyFields.map((f) => ({
      documentId: doc.id, ...f
    })),
  })

  console.log('✅ UJI SAVE DOCUMENT FIELDS SUKSES!')
  console.log('Dokumen ID:', doc.id)

  // Cek hasil simpanan
  const saved = await prisma.documentField.findMany({
    where: { documentId: doc.id },
  })
  console.log('Jumlah Frame TTD Tersimpan:', saved.length)
  console.dir(saved, { depth: null })
}

testSaveFields()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 