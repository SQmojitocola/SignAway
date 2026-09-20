import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    // 1. Cek Verifikasi Session User
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const senderId = session.user.id

    // 2. Parse FormData dari Request
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || 'Dokumen Tanpa Judul'
    const sequentialRaw = formData.get('sequential')
    const recipientsRaw = formData.get('recipients') as string | null

    if (!file) {
      return NextResponse.json({ message: 'File PDF wajib diunggah' }, { status: 400 })
    }

    const isSequential = sequentialRaw === 'true' || sequentialRaw === true

    // 3. Simpan File PDF ke Directory Storage Lokal
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const relativeFilePath = `/uploads/${uniqueFileName}`
    const absoluteFilePath = path.join(uploadDir, uniqueFileName)

    await writeFile(absoluteFilePath, buffer)

    // 4. Parse Daftar Recipient & Mapping ID User
    let parsedRecipients: Array<{ userId: string }> = []
    if (recipientsRaw) {
      try {
        parsedRecipients = JSON.parse(recipientsRaw)
      } catch (e) {
        console.error('Error parse recipients JSON:', e)
      }
    }

    // 📍 Penanganan ID "self": Jika userId bernilai "self", ganti dengan ID sender yang login
    const validRecipients = parsedRecipients.map((r) => {
      const realUserId = r.userId === 'self' ? senderId : r.userId
      return { userId: realUserId }
    })

    // Pastikan sender dimasukkan jika belum ada di list resipien
    const hasSender = validRecipients.some((r) => r.userId === senderId)
    if (!hasSender) {
      validRecipients.unshift({ userId: senderId })
    }

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
            signingOrder: index + 1, // Urutan TTD berurutan (1, 2, 3...)[cite: 21]
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