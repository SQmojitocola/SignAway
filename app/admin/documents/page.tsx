import { requireAdmin } from '@/lib/requireAdmin'
import { prisma } from '@/lib/prisma'
import AdminDocumentsClient from '@/components/admin/AdminDocumentsClient'

export default async function AdminDocumentsPage() {
  await requireAdmin()

  const documents = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      rejectReason: true,
      sender: { select: { id: true, name: true, email: true } },
      recipients: {
        select: {
          id: true,
          status: true,
          signingOrder: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  return (
    <main className="w-full max-w-6xl mx-auto py-8 px-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Administrator</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Monitoring Dokumen Global</h1>
        <p className="text-sm font-normal text-slate-500 mt-1">
          Pantau dan kelola seluruh dokumen yang beredar di sistem tanpa batas divisi.
        </p>
      </div>
      <AdminDocumentsClient
        initialDocuments={documents.map(d => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        }))}
      />
    </main>
  )
}
