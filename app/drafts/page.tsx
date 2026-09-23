import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DraftsTabClient from '@/components/DraftsTabClient'

export default async function DraftsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const userId = session.user.id

  // Fetch paralel: Draft, Dokumen Ditolak, dan Dokumen Selesai
  const [drafts, rejectedByMe, completedDocs] = await Promise.all([
    // 1. Fetch Draft milik Pengirim
    prisma.document.findMany({
      where: {
        senderId: userId,
        status: 'DRAFT',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        recipients: { include: { user: { select: { id: true, name: true, email: true } } } },
        fields: true,
      },
    }),

    // 2. Fetch Dokumen yang Ditolak oleh Penerima yang Login
    prisma.document.findMany({
      where: {
        recipients: {
          some: {
            userId: userId,
            status: 'REJECTED',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipients: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    }),

    // 3. Fetch Dokumen Selesai (COMPLETED) untuk user ini
    prisma.document.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { senderId: userId },
          { recipients: { some: { userId: userId, status: 'SIGNED' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipients: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    }),
  ])

  return (
    <main className="w-full max-w-6xl mx-auto py-8 px-6">
      <DraftsTabClient
        initialDrafts={drafts.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        }))}
        initialRejected={rejectedByMe.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        }))}
        initialCompleted={completedDocs.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        }))}
      />
    </main>
  )
}