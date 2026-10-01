import { NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json({ message: 'File avatar wajib diunggah' }, { status: 400 })
    }

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' },
        { status: 400 }
      )
    }

    // Validasi ukuran file (maks 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'Ukuran file terlalu besar. Maksimal 5MB.' },
        { status: 400 }
      )
    }

    // Simpan file ke folder public/uploads/avatars
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    await mkdir(uploadDir, { recursive: true })

    const uniqueFileName = `${session.user.id}-${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const relativeFilePath = `/uploads/avatars/${uniqueFileName}`
    const absoluteFilePath = path.join(uploadDir, uniqueFileName)

    await writeFile(absoluteFilePath, buffer)

    // Update avatarUrl di database
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: relativeFilePath },
      select: { id: true, avatarUrl: true },
    })

    return NextResponse.json(
      { message: 'Avatar berhasil diunggah', user },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Avatar upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { message: 'Gagal mengunggah avatar', error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Ambil avatarUrl sebelum dihapus
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    })

    if (user?.avatarUrl) {
      // Hapus file dari filesystem
      const absoluteFilePath = path.join(process.cwd(), 'public', user.avatarUrl)
      try {
        await unlink(absoluteFilePath)
      } catch (e) {
        console.error('Error deleting avatar file:', e)
      }
    }

    // Hapus avatarUrl dari database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
    })

    return NextResponse.json({ message: 'Avatar berhasil dihapus' }, { status: 200 })
  } catch (error: unknown) {
    console.error('Avatar delete error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { message: 'Gagal menghapus avatar', error: errorMessage },
      { status: 500 }
    )
  }
}
