import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  FileSearch,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'

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
    page?: string
  }>
}

import PageHeaderBanner from '@/components/PageHeaderBanner'

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

  if (query) {
    whereClause.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { sender: { name: { contains: query, mode: 'insensitive' } } },
      { sender: { email: { contains: query, mode: 'insensitive' } } },
    ]
  }

  const [totalFiltered, documents, statusCounts] = await Promise.all([
    prisma.document.count({ where: whereClause }),
    prisma.document.findMany({
      where: whereClause,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipients: {
          select: {
            id: true,
            status: true,
            signingOrder: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { signingOrder: 'asc' },
        },
      },
    }),
    Promise.all([
      prisma.document.count({ where: { status: { not: 'DRAFT' } } }),
      prisma.document.count({ where: { status: { in: ['PENDING', 'PARTIAL_SIGNED'] } } }),
      prisma.document.count({ where: { status: 'COMPLETED' } }),
      prisma.document.count({ where: { status: 'REJECTED' } }),
    ]),
  ])

  const [allCount, inProgressCount, completedCount, rejectedCount] = statusCounts
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      {/* Header Banner Card */}
      <PageHeaderBanner
        title="Monitoring Dokumen"
        subtitle="Pengawasan alur disposisi dan status tanda tangan dokumen instansi."
        action={
          <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1 border-t sm:border-t-0 sm:border-l border-white/15 pt-3 sm:pt-0 sm:pl-6 shrink-0">
            <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">Total Dokumen Aktif</p>
            <p className="text-2xl font-black text-white leading-none">{allCount}</p>
          </div>
        }
      />

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
            <Link
              href={`/admin/documents?status=ALL${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-[#003b73] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua ({allCount})
            </Link>
            <Link
              href={`/admin/documents?status=IN_PROGRESS${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Dalam Proses ({inProgressCount})
            </Link>
            <Link
              href={`/admin/documents?status=COMPLETED${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai ({completedCount})
            </Link>
            <Link
              href={`/admin/documents?status=REJECTED${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" /> Ditolak ({rejectedCount})
            </Link>
          </div>

          {/* Search Box */}
          <form method="GET" action="/admin/documents" className="relative min-w-[280px]">
            <input type="hidden" name="status" value={statusFilter} />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Cari judul dokumen atau pengunggah..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </form>
        </div>
      </div>

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
                      Coba sesuaikan kata kunci pencarian atau filter status.
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const waitingSigner = doc.recipients.find(
                    (r) => r.status === 'WAITING' || r.status === 'PENDING'
                  )

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
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

                      {/* Uploader */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#003b73] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {getInitials(doc.sender?.name || 'User')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{doc.sender?.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{doc.sender?.email}</p>
                          </div>
                        </div>
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
                                  className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white ${
                                    r.status === 'SIGNED'
                                      ? 'bg-emerald-500'
                                      : r.status === 'REJECTED'
                                      ? 'bg-rose-500'
                                      : 'bg-amber-500'
                                  }`}
                                >
                                  {getInitials(r.user.name)}
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
                        <Link
                          href={`/documents/${doc.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#003b73] text-white rounded-lg text-[11px] font-bold hover:bg-[#002d58] transition-colors shadow-xs"
                        >
                          Detail <ExternalLink className="w-3 h-3" />
                        </Link>
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
                  href={`/admin/documents?status=${statusFilter}&page=${currentPage - 1}${
                    query ? `&q=${encodeURIComponent(query)}` : ''
                  }`}
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
                  href={`/admin/documents?status=${statusFilter}&page=${currentPage + 1}${
                    query ? `&q=${encodeURIComponent(query)}` : ''
                  }`}
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
