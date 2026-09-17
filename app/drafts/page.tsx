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

  // 1. Fetch Draft milik Pengirim
  const drafts = await prisma.document.findMany({
    where: {
      senderId: userId,
      status: 'DRAFT',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      recipients: { include: { user: { select: { id: true, name: true, email: true } } } },
      fields: true,
    },
  })

  // 2. Fetch Dokumen yang Ditolak oleh Penerima yang Login
  const rejectedByMe = await prisma.document.findMany({
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
  })

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
      />
    </main>
  )
}