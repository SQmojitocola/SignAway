import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
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
    const { title, pdfBase64, recipientIds, sequential = false, documentId } = formData

    if (!title || !pdfBase64 || !recipientIds || !Array.isArray(recipientIds)) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 })
    }

    // 2. Reuse the existing draft file when returning from the editor.
    const buffer = Buffer.from(pdfBase64.split(',')[1] || pdfBase64, 'base64')
    let publicUrl: string
    if (documentId) {
      const existingDocument = await prisma.document.findFirst({
        where: { id: documentId, senderId, status: 'DRAFT' },
        select: { filePath: true },
      })
      if (!existingDocument) {
        return NextResponse.json({ message: 'Draft dokumen tidak ditemukan' }, { status: 404 })
      }
      publicUrl = existingDocument.filePath
    } else {
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`
      publicUrl = `/uploads/${fileName}`
    }

    await writeFile(path.join(process.cwd(), 'public', publicUrl), buffer)

    const newDocument = await prisma.$transaction(async (tx) => {
      if (documentId) {
        await tx.documentRecipient.deleteMany({
          where: { documentId, userId: { notIn: recipientIds } },
        })
        for (const [index, userId] of recipientIds.entries()) {
          const existingRecipient = await tx.documentRecipient.findFirst({
            where: { documentId, userId },
            select: { id: true },
          })
          if (existingRecipient) {
            await tx.documentRecipient.update({
              where: { id: existingRecipient.id },
              data: { signingOrder: index + 1 },
            })
          } else {
            await tx.documentRecipient.create({
              data: { documentId, userId, status: 'WAITING', signingOrder: index + 1 },
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
            create: recipientIds.map((userId: string, index: number) => ({
              userId,
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
  } catch (error) {
    console.error('Upload Error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}