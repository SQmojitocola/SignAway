import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    // 1. Cek Sesi Login User
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const senderId = session.user.id

    const formData = await req.json()
    const { title, pdfBase64, recipientIds, recipients, sequential = false, documentId } = formData

    // Ekstrak ID/Email resipien dari payload frontend
    const rawRecipients = recipientIds || recipients || []
    const extractedIdentifiers: string[] = rawRecipients
      .map((r: any) => (typeof r === 'string' ? r : r.userId || r.id || r.email))
      .filter(Boolean)

    if (!title || !pdfBase64 || extractedIdentifiers.length === 0) {
      return NextResponse.json(
        { message: 'Data tidak lengkap (Judul, PDF, atau Resipien kosong)' },
        { status: 400 }
      )
    }

    // 2. Validasi Keberadaan User di Database (Mendukung ID & Email)
    const validUsers = await prisma.user.findMany({
      where: {
        OR: [
          { id: { in: extractedIdentifiers } },
          { email: { in: extractedIdentifiers } },
        ],
      },
      select: { id: true },
    })

    const validUserIds = validUsers.map((u) => u.id)

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { message: 'ID/Email penerima tidak ditemukan di database' },
        { status: 400 }
      )
    }

    // 3. Pastikan folder public/uploads terbuat
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(pdfBase64.split(',')[1] || pdfBase64, 'base64')
    let publicUrl: string
    let absoluteFilePath: string

    if (documentId) {
      const existingDocument = await prisma.document.findFirst({
        where: { id: documentId, senderId, status: 'DRAFT' },
        select: { filePath: true },
      })
      if (!existingDocument) {
        return NextResponse.json({ message: 'Draft dokumen tidak ditemukan' }, { status: 404 })
      }
      publicUrl = existingDocument.filePath

      // Sanitasi path agar aman untuk path.join
      const cleanRelativePath = publicUrl.replace(/^\//, '')
      absoluteFilePath = path.join(process.cwd(), 'public', cleanRelativePath)
    } else {
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`
      publicUrl = `/uploads/${fileName}`
      absoluteFilePath = path.join(uploadDir, fileName)
    }

    // 4. Tulis file fisik ke disk
    await writeFile(absoluteFilePath, buffer)

    // 5. Transaksi Database Prisma menggunakan validUserIds
    const newDocument = await prisma.$transaction(async (tx) => {
      if (documentId) {
        await tx.documentRecipient.deleteMany({
          where: { documentId, userId: { notIn: validUserIds } },
        })
        for (const [index, userId] of validUserIds.entries()) {
          const existingRecipient = await tx.documentRecipient.findFirst({
            where: { documentId, userId },
            select: { id: true },
          })
          if (existingRecipient) {
            await tx.documentRecipient.update({
              where: { id: existingRecipient.id },
              data: {
                signingOrder: index + 1,
                role: 'Penandatangan',
              },
            })
          } else {
            await tx.documentRecipient.create({
              data: {
                documentId,
                userId,
                role: 'Penandatangan',
                status: 'WAITING',
                signingOrder: index + 1,
              },
            })
          }
        }
        return tx.document.update({
          where: { id: documentId },
          data: {
            title,
            fileSize: buffer.length,
            sequential,
          },
          include: { recipients: true },
        })
      }

      return tx.document.create({
        data: {
          title,
          filePath: publicUrl,
          fileSize: buffer.length,
          senderId,
          status: 'DRAFT',
          sequential,
          recipients: {
            create: validUserIds.map((userId: string, index: number) => ({
              userId,
              role: 'Penandatangan',
              status: 'WAITING',
              signingOrder: index + 1,
            })),
          },
        },
        include: { recipients: true },
      })
    })

    return NextResponse.json(
      { message: 'Dokumen berhasil diunggah', document: newDocument },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Upload Error:', error)
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    )
  }
}