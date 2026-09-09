'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock3, FileText, Search, SlidersHorizontal, Upload, XCircle } from 'lucide-react'

export interface DashboardDocument {
  id: string
  title: string
  createdAt: Date
  status: 'DRAFT' | 'PENDING' | 'PARTIAL_SIGNED' | 'COMPLETED' | 'REJECTED'
  sequential: boolean
  sender: { id: string; name: string; email: string }
  recipients: Array<{
    id: string
    status: 'WAITING' | 'PENDING' | 'SIGNED' | 'REJECTED'
    signingOrder: number | null
    user: { id: string; name: string; email: string }
  }>
}

export type DashboardCategory = 'waiting' | 'uploaded' | 'rejected' | 'completed'

interface PendingDocumentsProps {
  documents: DashboardDocument[]
  userId: string
}

const categoryConfig = [
  { key: 'waiting', title: 'Menunggu Tanda Tangan', badgeIcon: 'hourglass_top', colorClass: 'text-amber-500', bgBadgeClass: 'bg-amber-50' },
  { key: 'uploaded', title: 'Diupload', badgeIcon: 'upload', colorClass: 'text-blue-500', bgBadgeClass: 'bg-blue-50' },
  { key: 'rejected', title: 'Ditolak', badgeIcon: 'close', colorClass: 'text-red-500', bgBadgeClass: 'bg-red-50' },
  { key: 'completed', title: 'Diterima / Selesai', badgeIcon: 'done_all', colorClass: 'text-emerald-500', bgBadgeClass: 'bg-emerald-50' },
] as const

const DASHBOARD_SEEN_KEY = 'signaway_dashboard_seen_docs'

const readSeenDocs = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(DASHBOARD_SEEN_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function PendingDocuments({ documents, userId }: PendingDocumentsProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<DashboardCategory>('waiting')
  const [seenDocs, setSeenDocs] = useState<Record<string, boolean>>(() => readSeenDocs())

  const markDocAsSeen = (docId: string) => {
    const next = { ...seenDocs, [docId]: true }
    setSeenDocs(next)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DASHBOARD_SEEN_KEY, JSON.stringify(next))
    }
  }

  const counts = useMemo(() => {
    const waiting = documents.filter((doc) =>
      doc.recipients.some((recipient) => recipient.user.id === userId && (recipient.status === 'WAITING' || recipient.status === 'PENDING'))
    ).length

    const uploaded = documents.filter((doc) => doc.sender.id === userId).length

    const rejected = documents.filter((doc) =>
      doc.status === 'REJECTED' || doc.recipients.some((recipient) => recipient.user.id === userId && recipient.status === 'REJECTED')
    ).length

    const completed = documents.filter((doc) =>
      doc.status === 'COMPLETED' || doc.recipients.some((recipient) => recipient.user.id === userId && recipient.status === 'SIGNED')
    ).length

    return { waiting, uploaded, rejected, completed }
  }, [documents, userId])

  const hasUnreadDotForCategory = (category: DashboardCategory) => {
    if (category === 'waiting') {
      return documents.some((doc) => {
        const recipient = doc.recipients.find((item) => item.user.id === userId)
        return (
          recipient &&
          (recipient.status === 'WAITING' || recipient.status === 'PENDING') &&
          !seenDocs[doc.id]
        )
      })
    }

    if (category === 'uploaded') {
      return documents.some((doc) => doc.sender.id === userId && !seenDocs[doc.id])
    }

    return false
  }

  const filteredDocs = useMemo(() => {
    const query = search.toLowerCase()

    const base = documents.filter((doc) => {
      const matchesText =
        doc.title.toLowerCase().includes(query) ||
        doc.sender.name.toLowerCase().includes(query) ||
        doc.sender.email.toLowerCase().includes(query)

      if (!query) return true
      return matchesText
    })

    switch (selectedCategory) {
      case 'waiting':
        return base.filter((doc) =>
          doc.recipients.some((recipient) => recipient.user.id === userId && (recipient.status === 'WAITING' || recipient.status === 'PENDING'))
        )
      case 'uploaded':
        return base.filter((doc) => doc.sender.id === userId)
      case 'rejected':
        return base.filter((doc) =>
          doc.status === 'REJECTED' || doc.recipients.some((recipient) => recipient.user.id === userId && recipient.status === 'REJECTED')
        )
      case 'completed':
        return base.filter((doc) =>
          doc.status === 'COMPLETED' || doc.recipients.some((recipient) => recipient.user.id === userId && recipient.status === 'SIGNED')
        )
      default:
        return base
    }
  }, [documents, search, selectedCategory, userId])

  const panelTitle = {
    waiting: 'Dokumen Menunggu Tanda Tangan',
    uploaded: 'Dokumen Saya Upload',
    rejected: 'Dokumen Ditolak',
    completed: 'Dokumen Diterima / Selesai',
  }[selectedCategory]

  const renderStatusBadge = (doc: DashboardDocument) => {
    if (selectedCategory === 'waiting') {
      const recipient = doc.recipients.find((item) => item.user.id === userId)
      const status = recipient?.status

      if (status === 'PENDING') {
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold">MENUNGGU GILIRAN</span>
      }

      return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold">MENUNGGU</span>
    }

    if (selectedCategory === 'uploaded') {
      return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold">{doc.status}</span>
    }

    if (selectedCategory === 'rejected') {
      return <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold">DITOLAK</span>
    }

    return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">SELESAI</span>
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {categoryConfig.map((category) => {
          const Icon =
            category.badgeIcon === 'hourglass_top'
              ? Clock3
              : category.badgeIcon === 'upload'
                ? Upload
                : category.badgeIcon === 'close'
                  ? XCircle
                  : CheckCircle2

          const hasUnreadDot = hasUnreadDotForCategory(category.key)

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setSelectedCategory(category.key)}
              className={`relative w-full bg-white p-5 rounded-2xl border text-left transition-all ${
                selectedCategory === category.key ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              {hasUnreadDot && (
                <span className="absolute -top-1.5 right-2 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white shadow-sm" />
              )}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{category.title}</p>
                  <h3 className="mt-2 text-3xl font-extrabold text-slate-800">{counts[category.key]}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${category.bgBadgeClass}`}>
                  <Icon className={`h-6 w-6 ${category.colorClass}`} />
                </div>
              </div>
            </button>
          )
        })}
      </section>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">{panelTitle}</h3>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari dokumen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4">Nama Dokumen</th>
                <th className="p-4">Pengirim</th>
                <th className="p-4">Penerima</th>
                <th className="p-4">Tanggal Diterima</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    Tidak ada dokumen di kategori ini.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const formattedDate = new Date(doc.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })

                  const showActionDot = selectedCategory === 'uploaded' && doc.sender.id === userId && !seenDocs[doc.id]

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{doc.title}</p>
                            <p className="text-[10px] text-slate-400">ID: {doc.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e4273] text-[10px] font-bold text-white shrink-0">
                            {getInitials(doc.sender.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 truncate">{doc.sender.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{doc.sender.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {doc.recipients.length > 0 ? (
                          <div className="flex items-center -space-x-2">
                            {doc.recipients.slice(0, 4).map((recipient) => (
                              <div
                                key={recipient.id}
                                title={recipient.user.name}
                                className="group relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-600 shadow-sm transition-transform hover:scale-105"
                              >
                                {getInitials(recipient.user.name)}
                              </div>
                            ))}
                            {doc.recipients.length > 4 && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-bold text-slate-500 shadow-sm">
                                +{doc.recipients.length - 4}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{formattedDate}</td>
                      <td className="p-4">{renderStatusBadge(doc)}</td>
                      <td className="p-4 text-center">
                        <div className="relative inline-flex">
                          {showActionDot && (
                            <span className="absolute -top-1.5 right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                          )}

                          <button
                            onClick={() => {
                              markDocAsSeen(doc.id)
                              router.push(`/documents/${doc.id}/edit`)
                            }}
                            className="px-4 py-2 bg-[#1e4273] hover:bg-blue-900 text-white font-semibold rounded-xl text-xs transition-colors"
                          >
                            {selectedCategory === 'waiting' ? 'Tanda Tangani' : 'Lihat Detail'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <p>Menampilkan {filteredDocs.length} dari {documents.length} dokumen</p>
          <div className="flex gap-2">
            <button disabled className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-40">Sebelumnya</button>
            <button disabled className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-40">Selanjutnya</button>
          </div>
        </div>
      </div>
    </div>
  )
}