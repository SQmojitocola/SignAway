import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    // 1. Verifikasi Session User Login
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const senderId = session.user.id

    // 2. Parse Form Data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || 'Dokumen Tanpa Judul'
    const sequentialRaw = formData.get('sequential')
    const recipientsRaw = formData.get('recipients') as string | null

    if (!file) {
      return NextResponse.json({ message: 'File PDF wajib diunggah' }, { status: 400 })
    }

    const isSequential = sequentialRaw === 'true' || sequentialRaw === true

    // 3. Simpan Berkas PDF ke Folder Storage Local
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const relativeFilePath = `/uploads/${uniqueFileName}`
    const absoluteFilePath = path.join(uploadDir, uniqueFileName)

    await writeFile(absoluteFilePath, buffer)

    // 4. Parse & Cocokkan Recipient Email ke Tabel User Database
    let rawRecipients: Array<{ userId?: string; email?: string }> = []
    if (recipientsRaw) {
      try {
        rawRecipients = JSON.parse(recipientsRaw)
      } catch (e) {
        console.error('Error parsing recipients JSON:', e)
      }
    }

    const resolvedUserIds: string[] = []
    const missingRecipientEmails: string[] = []

    for (const item of rawRecipients) {
      let user = null

      if (item.email?.trim()) {
        user = await prisma.user.findFirst({
          where: { email: { equals: item.email.trim(), mode: 'insensitive' } },
          select: { id: true },
        })
      }

      if (!user && item.userId && item.userId !== 'self' && !item.userId.startsWith('user-')) {
        user = await prisma.user.findUnique({
          where: { id: item.userId },
          select: { id: true },
        })
      }

      if (user) {
        resolvedUserIds.push(user.id)
      } else if (item.email?.trim()) {
        missingRecipientEmails.push(item.email.trim())
      }
    }

    if (missingRecipientEmails.length > 0) {
      return NextResponse.json(
        {
          message: 'Satu atau lebih penerima belum terdaftar sebagai pengguna',
          emails: missingRecipientEmails,
        },
        { status: 400 }
      )
    }

    // Pastikan ID Pengirim (sender) dimasukkan di urutan pertama jika belum ada
    if (!resolvedUserIds.includes(senderId)) {
      resolvedUserIds.unshift(senderId)
    }

    // Buat objek resipien tanpa duplikasi ID
    const uniqueUserIds = Array.from(new Set(resolvedUserIds))
    const validRecipients = uniqueUserIds.map((userId) => ({ userId }))

    // 5. Buat Dokumen & Recipient di Database Prisma
    const newDocument = await prisma.document.create({
      data: {
        title,
        filePath: relativeFilePath,
        senderId,
        sequential: isSequential,
        status: 'DRAFT',
        recipients: {
          create: validRecipients.map((recipient, index) => ({
            userId: recipient.userId,
            role: recipient.userId === senderId ? 'Pengirim & Penandatangan' : 'Penandatangan',
            status: 'PENDING',
            signingOrder: index + 1,
          })),
        },
      },
      include: {
        recipients: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Dokumen berhasil diunggah',
        documentId: newDocument.id,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Upload Document API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { message: 'Gagal mengunggah dokumen ke database', error: errorMessage },
      { status: 500 }
    )
  }
}