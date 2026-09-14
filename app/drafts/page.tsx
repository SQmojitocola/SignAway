import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, FolderOpen } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DeleteDraftButton from '@/components/DeleteDraftButton'

export default async function DraftsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const drafts = await prisma.document.findMany({
    where: {
      senderId: session.user.id,
      status: 'DRAFT',
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      recipients: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      fields: true,
    },
  })

  return (
    <main className="w-full max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Draft</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-800">Dokumen belum dikirim</h1>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          <FolderOpen className="h-4 w-4 text-blue-600" />
          {drafts.length} dokumen
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-700">Belum ada draft</h2>
          <p className="mt-2 text-sm text-slate-500">
            Dokumen yang sudah diedit atau diberi plot tanda tangan tapi belum dikirim akan muncul di sini.
          </p>
          <Link
            href="/upload"
            className="mt-5 inline-flex rounded-xl bg-[#1e4273] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
          >
            Buat dokumen baru
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {drafts.map((draft) => (
            <div key={draft.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Draft</p>
                  <h2 className="mt-2 line-clamp-2 text-lg font-bold text-slate-800">{draft.title}</h2>
                </div>
                <div className="rounded-full bg-amber-50 p-2 text-amber-600">
                  <FolderOpen className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <p>
                  Dibuat:{' '}
                  {new Date(draft.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <p>Jumlah penerima: {draft.recipients.length}</p>
                <p>Field TTD: {draft.fields.length}</p>
              </div>

              <div className="mt-5 flex gap-2">
                <Link
                  href={`/documents/${draft.id}/edit`}
                  className="flex-1 rounded-xl bg-[#1e4273] px-3 py-2 text-center text-xs font-semibold text-white hover:bg-blue-900"
                >
                  Lanjut Edit
                </Link>
                
                {/* Menggunakan Client Component tombol hapus di sini */}
                <DeleteDraftButton documentId={draft.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}