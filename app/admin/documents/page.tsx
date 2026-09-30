import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import CancelDocumentButton from '@/components/admin/CancelDocumentButton'
import DocumentFilterBar from '@/components/admin/DocumentFilterBar'
import PageHeaderBanner from '@/components/PageHeaderBanner'

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  )
}

function formatDateIndo(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

interface PageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    sender?: string
    page?: string
  }>
}

export default async function AdminDocumentsPage(props: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const searchParams = await props.searchParams
  const query = searchParams.q?.trim() || ''
  const statusFilter = searchParams.status || 'ALL'
  const senderFilter = searchParams.sender?.trim() || 'ALL'
  const currentPage = Math.max(1, parseInt(searchParams.page || '1', 10))
  const pageSize = 10

  // Filter Prisma (Draft hanya privat untuk masing-masing user, tidak ditampilkan ke admin)
  const whereClause: any = {}

  if (statusFilter === 'COMPLETED') {
    whereClause.status = 'COMPLETED'
  } else if (statusFilter === 'IN_PROGRESS') {
    whereClause.status = { in: ['PENDING', 'PARTIAL_SIGNED'] }
  } else if (statusFilter === 'REJECTED') {
    whereClause.status = 'REJECTED'
  } else {
    whereClause.status = { not: 'DRAFT' }
  }

  if (senderFilter !== 'ALL') {
    whereClause.senderId = senderFilter
  }

  if (query) {
    whereClause.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { sender: { name: { contains: query, mode: 'insensitive' } } },
      { sender: { email: { contains: query, mode: 'insensitive' } } },
    ]
  }

  const senderWhere = senderFilter !== 'ALL' ? { senderId: senderFilter } : {}

  const [totalFiltered, documents, statusCounts, senders] = await Promise.all([
    prisma.document.count({ where: whereClause }),
    prisma.document.findMany({
      where: whereClause,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
        recipients: {
          select: {
            id: true,
            status: true,
            signingOrder: true,
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { signingOrder: 'asc' },
        },
      },
    }),
    Promise.all([
      prisma.document.count({ where: { status: { not: 'DRAFT' }, ...senderWhere } }),
      prisma.document.count({ where: { status: { in: ['PENDING', 'PARTIAL_SIGNED'] }, ...senderWhere } }),
      prisma.document.count({ where: { status: 'COMPLETED', ...senderWhere } }),
      prisma.document.count({ where: { status: 'REJECTED', ...senderWhere } }),
    ]),
    prisma.user.findMany({
      where: {
        sentDocuments: {
          some: {
            status: { not: 'DRAFT' },
          },
        },
      },
      select: {
        id: true,
        name: true,
        department: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const [allCount, inProgressCount, completedCount, rejectedCount] = statusCounts
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1

  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter)
    if (senderFilter && senderFilter !== 'ALL') params.set('sender', senderFilter)
    if (query) params.set('q', query)
    if (pageNumber > 1) params.set('page', pageNumber.toString())
    const qs = params.toString()
    return `/admin/documents${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      {/* Header Banner Card */}
      <PageHeaderBanner
        title="Monitoring Dokumen"
        subtitle="Pengawasan alur disposisi dan status tanda tangan dokumen instansi."
        action={
          <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1 border-t sm:border-t-0 sm:border-l border-white/15 pt-3 sm:pt-0 sm:pl-6 shrink-0">
            <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">
              {senderFilter !== 'ALL' ? 'Dokumen Pengunggah' : 'Total Dokumen Aktif'}
            </p>
            <p className="text-2xl font-black text-white leading-none">{allCount}</p>
          </div>
        }
      />

      {/* Filter Tabs, Sender Dropdown & Search */}
      <DocumentFilterBar
        statusFilter={statusFilter}
        senderFilter={senderFilter}
        query={query}
        counts={{ allCount, inProgressCount, completedCount, rejectedCount }}
        senders={senders}
      />

      {/* Tabel Monitoring */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama Dokumen</th>
                <th className="py-3.5 px-4">Pengunggah</th>
                <th className="py-3.5 px-4">Alur Penandatangan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Terakhir Diperbarui</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada dokumen ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba sesuaikan kata kunci pencarian, filter status, atau pilihan pengunggah.
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((doc, idx) => {
                  const waitingSigner = doc.recipients.find(
                    (r) => r.status === 'WAITING' || r.status === 'PENDING'
                  )

                  // Selang-seling warna putih dan biru cerah (#f0f7ff)
                  const rowBg = idx % 2 === 1 ? 'bg-[#f0f7ff]' : 'bg-white'

                  return (
                    <tr key={doc.id} className={`${rowBg} hover:bg-blue-100/60 transition-colors`}>
                      {/* Judul */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 text-[#003b73] rounded-lg shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[240px]" title={doc.title}>
                              {doc.title}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              ID: {doc.id.substring(0, 8).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Uploader (Clickable to quickly filter by this sender) */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/documents?status=${statusFilter}&sender=${doc.sender?.id || ''}${
                            query ? `&q=${encodeURIComponent(query)}` : ''
                          }`}
                          title={`Filter dokumen hanya dari ${doc.sender?.name || 'Pengunggah'}`}
                          className="flex items-center gap-2 group hover:opacity-85 transition-opacity"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#003b73] text-white flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden shadow-xs border border-white/20">
                            {doc.sender?.avatarUrl ? (
                              <img src={doc.sender.avatarUrl} alt={doc.sender?.name || 'User'} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(doc.sender?.name || 'User')
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                              {doc.sender?.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{doc.sender?.email}</p>
                          </div>
                        </Link>
                      </td>

                      {/* Alur Penandatangan */}
                      <td className="py-3.5 px-4">
                        {doc.recipients.length > 0 ? (
                          <div>
                            <div className="flex items-center -space-x-1.5 mb-1">
                              {doc.recipients.slice(0, 4).map((r) => (
                                <div
                                  key={r.id}
                                  title={`${r.user.name} (${r.status})`}
                                  className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white overflow-hidden shadow-xs ${
                                    r.status === 'SIGNED'
                                      ? 'bg-emerald-500'
                                      : r.status === 'REJECTED'
                                      ? 'bg-rose-500'
                                      : 'bg-amber-500'
                                  }`}
                                >
                                  {r.user.avatarUrl ? (
                                    <img src={r.user.avatarUrl} alt={r.user.name} className="w-full h-full object-cover" />
                                  ) : (
                                    getInitials(r.user.name)
                                  )}
                                </div>
                              ))}
                              {doc.recipients.length > 4 && (
                                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">
                                  +{doc.recipients.length - 4}
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                              {doc.status === 'COMPLETED'
                                ? 'Semua TTD Lengkap'
                                : doc.status === 'REJECTED'
                                ? 'Ditolak'
                                : waitingSigner
                                ? `Menunggu: ${waitingSigner.user.name}`
                                : 'Dalam Proses'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                            doc.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : doc.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : doc.status === 'PARTIAL_SIGNED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {doc.status === 'COMPLETED'
                            ? 'Selesai'
                            : doc.status === 'REJECTED'
                            ? 'Ditolak'
                            : doc.status === 'PARTIAL_SIGNED'
                            ? 'Sebagian TTD'
                            : 'Menunggu TTD'}
                        </span>
                      </td>

                      {/* Updated At */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                        {formatDateIndo(doc.updatedAt)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#003b73] text-white rounded-lg text-[11px] font-bold hover:bg-[#002d58] transition-colors shadow-xs"
                          >
                            Detail <ExternalLink className="w-3 h-3" />
                          </Link>

                          <CancelDocumentButton
                            documentId={doc.id}
                            documentTitle={doc.title}
                            documentStatus={doc.status}
                            variant="table"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <p>
              Menampilkan {Math.min((currentPage - 1) * pageSize + 1, totalFiltered)} -{' '}
              {Math.min(currentPage * pageSize, totalFiltered)} dari {totalFiltered} dokumen
            </p>
            <div className="flex items-center gap-1.5">
              {currentPage > 1 && (
                <Link
                  href={buildPageUrl(currentPage - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              )}
              <span className="px-3 py-1 font-bold text-slate-700">
                Hal {currentPage} dari {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={buildPageUrl(currentPage + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
