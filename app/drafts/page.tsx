import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, FolderOpen, XCircle, Eye } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DeleteDraftButton from '@/components/DeleteDraftButton'

export default async function DraftsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const userId = session.user.id

  // 1. Fetch Draft Belum Dikirim (Pengirim)
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
    <main className="w-full max-w-6xl mx-auto py-8 px-4 space-y-10">
      {/* SEKSI 1: DRAFT BELUM DIKIRIM */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Draft</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800">Dokumen Belum Dikirim</h1>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm font-semibold">
            <FolderOpen className="h-4 w-4 text-blue-600" />
            {drafts.length} dokumen
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-3 text-sm font-semibold text-slate-700">Belum ada draft</h2>
            <p className="mt-1 text-xs text-slate-500">Dokumen yang belum dikirim akan tersimpan di sini.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Draft</p>
                    <h2 className="mt-1 line-clamp-2 text-base font-bold text-slate-800">{draft.title}</h2>
                  </div>
                  <div className="rounded-full bg-amber-50 p-2 text-amber-600">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <p>
                    Dibuat:{' '}
                    {new Date(draft.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p>Jumlah penerima: {draft.recipients.length}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/documents/${draft.id}/edit`}
                    className="flex-1 rounded-xl bg-[#1e4273] px-3 py-2 text-center text-xs font-semibold text-white hover:bg-blue-900"
                  >
                    Lanjut Edit
                  </Link>
                  <DeleteDraftButton documentId={draft.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SEKSI 2: DOKUMEN DITOLAK (YANG DITOLAK OLEH USER INI) */}
      <section className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Arsip Penolakan</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-800">Dokumen Ditolak</h2>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 font-semibold">
            <XCircle className="h-4 w-4 text-red-600" />
            {rejectedByMe.length} dokumen
          </div>
        </div>

        {rejectedByMe.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
            <XCircle className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-xs text-slate-500">Anda belum pernah menolak dokumen apapun.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rejectedByMe.map((doc) => (
              <div key={doc.id} className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-[9px] font-bold uppercase">
                      Ditolak
                    </span>
                    <h2 className="mt-1 line-clamp-2 text-base font-bold text-slate-800">{doc.title}</h2>
                  </div>
                  <div className="rounded-full bg-red-50 p-2 text-red-500">
                    <XCircle className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <p>Pengirim: <span className="font-semibold text-slate-700">{doc.sender?.name}</span></p>
                  <p>
                    Tanggal:{' '}
                    {new Date(doc.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Eye className="h-3.5 w-3.5" /> Lihat Detail Penolakan
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}