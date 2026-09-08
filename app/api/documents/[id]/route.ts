import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const document = await prisma.document.findFirst({
      where: {
        id,
        senderId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        filePath: true,
        createdAt: true,
        sequential: true,
        sender: {
          select: { id: true, name: true, email: true },
        },
        recipients: {
          select: {
            id: true,
            status: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}