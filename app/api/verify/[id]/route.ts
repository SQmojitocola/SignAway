import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || id === 'check') {
      return NextResponse.json({ message: 'Document ID tidak valid' }, { status: 400 })
    }

    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        filePath: true,
        status: true,
        checksum: true,
        createdAt: true,
        sender: {
          select: { id: true, name: true, email: true },
        },
        recipients: {
          select: {
            id: true,
            status: true,
            role: true,
            signingOrder: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        logs: {
          select: {
            id: true,
            signerId: true,
            ipAddress: true,
            signedAt: true,
            signatureImagePath: true,
            signer: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { signedAt: 'asc' },
        },
        proxyRequests: {
          where: { status: 'APPROVED' },
          select: {
            id: true,
            reason: true,
            requestedBy: { select: { id: true, name: true, email: true } },
            targetUser: { select: { id: true, name: true, email: true } },
            approvedBy: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan atau belum terdaftar' }, { status: 404 })
    }

    // Format logs agar sesuai dengan struktur verifier page
    const formattedLogs = document.logs.map((log) => ({
      id: log.id,
      signerId: log.signerId,
      signerName: log.signer?.name,
      ipAddress: log.ipAddress,
      createdAt: log.signedAt.toISOString(),
    }))

    return NextResponse.json(
      {
        document: {
          ...document,
          logs: formattedLogs,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Public verify error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
