'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, FolderOpen, XCircle, CheckCircle2, Eye, Download } from 'lucide-react'
import DeleteDraftButton from '@/components/DeleteDraftButton'

interface DraftItem {
  id: string
  title: string
  createdAt: string
  recipients: Array<{ id: string; user: { id: string; name: string; email: string } }>
  fields: any[]
}

interface RejectedItem {
  id: string
  title: string
  createdAt: string
  sender?: { id: string; name: string; email: string }
  recipients: Array<{ id: string; user: { id: string; name: string; email: string } }>
}

interface CompletedItem {
  id: string
  title: string
  createdAt: string
  sender?: { id: string; name: string; email: string }
  recipients: Array<{ id: string; user: { id: string; name: string; email: string } }>
}

interface DraftsTabClientProps {
  initialDrafts: DraftItem[]
  initialRejected: RejectedItem[]
  initialCompleted: CompletedItem[]
}

export default function DraftsTabClient({
  initialDrafts,
  initialRejected,
  initialCompleted = [],
}: DraftsTabClientProps) {
  const [activeTab, setActiveTab] = useState<'drafts' | 'rejected' | 'completed'>('drafts')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (docId: string, title: string) => {
    setDownloadingId(docId)
    try {
      const response = await fetch(`/api/documents/${docId}/download`)
      if (!response.ok) throw new Error('Gagal mengunduh dokumen')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = title.endsWith('.pdf') ? title : `${title}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      alert('Gagal mengunduh berkas PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Manajemen Dokumen</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Draft, Penolakan & Selesai</h1>
          <p className="text-sm font-normal text-slate-500 mt-1">Pantau dan kelola berkas draf yang belum dikirim, ditolak, serta selesai ditandatangani.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-xl">
          {/* Tab 1: Draft */}
          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'drafts'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FolderOpen className="h-4 w-4 text-blue-600" />
            Draft Belum Dikirim
            <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 font-extrabold">
              {initialDrafts.length}
            </span>
          </button>

          {/* Tab 2: Ditolak */}
          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'rejected'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <XCircle className="h-4 w-4 text-red-500" />
            Dokumen Ditolak
            <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700 font-extrabold">
              {initialRejected.length}
            </span>
          </button>

          {/* Tab 3: Selesai (Completed) */}
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Dokumen Selesai
            <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700 font-extrabold">
              {initialCompleted.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: DRAFT BELUM DIKIRIM */}
      {activeTab === 'drafts' && (
        <div>
          {initialDrafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-base font-bold text-slate-700">Belum ada draft</h2>
              <p className="mt-1 text-xs text-slate-500">
                Dokumen yang sudah diupload tetapi belum dikirim akan tersimpan di sini.
              </p>
              <Link
                href="/upload"
                className="mt-5 inline-flex rounded-xl bg-[#1e4273] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
              >
                Buat Dokumen Baru
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {initialDrafts.map((draft) => (
                <div key={draft.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] font-bold uppercase shrink-0">Draft</span>
                      <div className="rounded-full bg-amber-50 p-2 text-amber-600 shrink-0">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 break-all line-clamp-2 leading-snug" title={draft.title}>
                      {draft.title}
                    </h2>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <p>
                      Dibuat:{' '}
                      {new Date(draft.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p>Penerima: {draft.recipients.length} orang</p>
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
        </div>
      )}

      {/* TAB 2: DOKUMEN DITOLAK */}
      {activeTab === 'rejected' && (
        <div>
          {initialRejected.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <XCircle className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-base font-bold text-slate-700">Tidak ada penolakan</h2>
              <p className="mt-1 text-xs text-slate-500">Anda belum pernah menolak dokumen apapun.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {initialRejected.map((doc) => (
                <div key={doc.id} className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm space-y-3 hover:border-red-200 transition-all flex flex-col justify-between overflow-hidden">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-[9px] font-bold uppercase shrink-0">Ditolak</span>
                      <div className="rounded-full bg-red-50 p-2 text-red-500 shrink-0">
                        <XCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 break-all line-clamp-2 leading-snug" title={doc.title}>
                      {doc.title}
                    </h2>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <p className="truncate">Pengirim: <span className="font-semibold text-slate-700">{doc.sender?.name || '-'}</span></p>
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
                      className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> Lihat Detail Penolakan
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DOKUMEN SELESAI (COMPLETED) */}
      {activeTab === 'completed' && (
        <div>
          {initialCompleted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-base font-bold text-slate-700">Belum ada dokumen selesai</h2>
              <p className="mt-1 text-xs text-slate-500">
                Dokumen yang sudah selesai ditandatangani oleh semua pihak akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {initialCompleted.map((doc) => (
                <div key={doc.id} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm space-y-3 hover:border-emerald-200 transition-all flex flex-col justify-between overflow-hidden">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase shrink-0">Selesai</span>
                      <div className="rounded-full bg-emerald-50 p-2 text-emerald-500 shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 break-all line-clamp-2 leading-snug" title={doc.title}>
                      {doc.title}
                    </h2>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <p className="truncate">Pengirim: <span className="font-semibold text-slate-700">{doc.sender?.name || '-'}</span></p>
                    <p>
                      Selesai:{' '}
                      {new Date(doc.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> Lihat Detail
                    </Link>
                    <button
                      type="button"
                      disabled={downloadingId === doc.id}
                      onClick={() => handleDownload(doc.id, doc.title)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloadingId === doc.id ? 'Mengunduh...' : 'Unduh'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}