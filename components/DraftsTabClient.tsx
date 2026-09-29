'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { FileText, FolderOpen, XCircle, CheckCircle2, Eye, Download, Search, ArrowUpDown, ChevronDown, Clock } from 'lucide-react'
import DeleteDraftButton from '@/components/DeleteDraftButton'

interface DraftItem {
  id: string
  title: string
  createdAt: string
  recipients: Array<{ id: string; user: { id: string; name: string; email: string } }>
  fields?: unknown[]
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

  // 📍 State Pencarian & Sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  // 📍 Data tab aktif
  const activeDocuments = useMemo(() => {
    if (activeTab === 'drafts') return initialDrafts
    if (activeTab === 'rejected') return initialRejected
    return initialCompleted
  }, [activeTab, initialDrafts, initialRejected, initialCompleted])

  // 📍 Filter & Search Logic
  const filteredDocuments = useMemo(() => {
    let result = [...activeDocuments]

    // Search by title or sender/recipient name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter((doc) => {
        const titleMatch = doc.title.toLowerCase().includes(query)
        const senderMatch = ('sender' in doc && doc.sender?.name.toLowerCase().includes(query)) ?? false
        const recipientMatch = doc.recipients.some((r) =>
          r.user.name.toLowerCase().includes(query)
        )
        return titleMatch || senderMatch || recipientMatch
      })
    }

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [activeDocuments, searchQuery, sortOrder])

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

      {/* 📍 BILAH PENCARIAN & SORTING */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan judul atau nama pengirim/penerima..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors min-w-[140px] justify-between"
          >
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span>{sortOrder === 'newest' ? 'Terbaru' : 'Terlama'}</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showSortDropdown && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-slate-200 bg-white shadow-lg z-20 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setSortOrder('newest')
                  setShowSortDropdown(false)
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors ${
                  sortOrder === 'newest' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Terbaru</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortOrder('oldest')
                  setShowSortDropdown(false)
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors ${
                  sortOrder === 'oldest' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Terlama</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info hasil filter */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Search className="h-3.5 w-3.5" />
          <span>
            Menampilkan {filteredDocuments.length} dari {activeDocuments.length} dokumen
            {searchQuery && <span> untuk &quot;{searchQuery}&quot;</span>}
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="ml-2 text-blue-600 hover:text-blue-700 font-semibold hover:underline"
          >
            Reset
          </button>
        </div>
      )}

      {/* 📍 TAMPILKAN HASIL FILTER */}
      {filteredDocuments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-base font-bold text-slate-700">
            {searchQuery ? 'Tidak ada dokumen yang cocok' : 'Belum ada dokumen'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery
              ? 'Coba ubah kata kunci pencarian Anda.'
              : 'Dokumen yang sudah diupload akan tersimpan di sini.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDocuments.map((doc) => {
            const isDraft = activeTab === 'drafts'
            const isRejected = activeTab === 'rejected'
            const isCompleted = activeTab === 'completed'

            return (
              <div
                key={doc.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden ${
                  isDraft ? 'border-slate-200' : isRejected ? 'border-red-100 hover:border-red-200' : 'border-emerald-100 hover:border-emerald-200'
                }`}
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                      isDraft ? 'bg-amber-50 text-amber-600' : isRejected ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {isDraft ? 'Draft' : isRejected ? 'Ditolak' : 'Selesai'}
                    </span>
                    <div className={`rounded-full p-2 shrink-0 ${
                      isDraft ? 'bg-amber-50' : isRejected ? 'bg-red-50' : 'bg-emerald-50'
                    }`}>
                      {isDraft && <FolderOpen className={`h-4 w-4 ${isDraft ? 'text-amber-600' : ''}`} />}
                      {isRejected && <XCircle className="h-4 w-4 text-red-500" />}
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                  </div>
                  <h2 className="text-sm font-bold text-slate-800 break-all line-clamp-2 leading-snug" title={doc.title}>
                    {doc.title}
                  </h2>
                </div>

                <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {'sender' in doc && doc.sender && (
                    <p className="truncate">Pengirim: <span className="font-semibold text-slate-700">{doc.sender.name}</span></p>
                  )}
                  {isDraft && <p>Penerima: {doc.recipients.length} orang</p>}
                  <p>
                    {isCompleted ? 'Selesai' : 'Dibuat'}:{' '}
                    {new Date(doc.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  {isDraft && (
                    <>
                      <Link
                        href={`/documents/${doc.id}/edit`}
                        className="flex-1 rounded-xl bg-[#1e4273] px-3 py-2 text-center text-xs font-semibold text-white hover:bg-blue-900"
                      >
                        Lanjut Edit
                      </Link>
                      <DeleteDraftButton documentId={doc.id} />
                    </>
                  )}
                  {isRejected && (
                    <Link
                      href={`/documents/${doc.id}`}
                      className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> Lihat Detail Penolakan
                    </Link>
                  )}
                  {isCompleted && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
