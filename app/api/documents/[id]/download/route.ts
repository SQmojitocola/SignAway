import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
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

    const { id } = await params
    const userId = session.user.id

    // Cari dokumen yang dimiliki pengirim atau terdaftar sebagai penerima
    const document = await prisma.document.findFirst({
      where: {
        id,
        OR: [{ senderId: userId }, { recipients: { some: { userId: userId } } }],
      },
      select: {
        id: true,
        title: true,
        filePath: true,
      },
    })

    if (!document || !document.filePath) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    // Bersihkan path file publik
    const cleanPath = document.filePath.replace(/^\//, '').replace(/^public\//, '')
    const absoluteFilePath = path.join(process.cwd(), 'public', cleanPath)

    // Baca berkas PDF dari disk
    const fileBuffer = await readFile(absoluteFilePath)

    const filename = document.title.endsWith('.pdf') ? document.title : `${document.title}.pdf`

    // Stream berkas PDF ke browser
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error('Download API error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}