import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = await params
    const document = await prisma.document.findFirst({
      where: {
        id,
        OR: [{ senderId: userId }, { recipients: { some: { userId: userId } } }],
      },
      select: {
        id: true,
        title: true,
        filePath: true,
        status: true, // 📍 Ditambahkan: Status Dokumen
        rejectReason: true, // 📍 Ditambahkan: Alasan Penolakan Utama Dokumen
        createdAt: true,
        sequential: true,
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
        recipients: {
          select: {
            id: true,
            role: true,
            status: true,
            signingOrder: true,
            rejectReason: true, // 📍 Ditambahkan: Alasan Penolakan dari Recipient
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        fields: {
          select: {
            id: true,
            recipientId: true,
            pageNumber: true,
            posX: true,
            posY: true,
            width: true,
            height: true,
            recipient: {
              select: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    const currentRecipient =
      document.recipients.find((recipient) => recipient.user.id === userId) ??
      document.recipients[0] ??
      null

    const normalizeFilePath = (value: string) => {
      if (!value) return '/uploads/default.pdf'
      if (value.startsWith('http')) return value
      return value.startsWith('/') ? value : `/${value.replace(/^\.?\//, '')}`
    }

    const responseDocument = {
      ...document,
      filePath: normalizeFilePath(document.filePath),
      senderRole: document.sender.role,
      currentRecipient: currentRecipient
        ? {
            id: currentRecipient.id,
            userId: currentRecipient.user.id,
            name: currentRecipient.user.name,
            email: currentRecipient.user.email,
            role: currentRecipient.role ?? currentRecipient.user.role,
          }
        : null,
    }

    return NextResponse.json({ document: responseDocument })
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}