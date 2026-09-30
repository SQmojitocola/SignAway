import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileClock,
  Sparkles,
  Building2,
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

function getSignerPosition(doc: {
  status: string
  sequential: boolean
  recipients: Array<{
    status: string
    signingOrder: number | null
    user: { name: string }
  }>
}) {
  if (doc.status === 'COMPLETED') {
    return {
      text: 'Semua TTD Selesai',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      iconClass: 'text-emerald-500',
    }
  }

  if (doc.status === 'REJECTED') {
    const rejecter = doc.recipients.find((r) => r.status === 'REJECTED')
    return {
      text: rejecter ? `Ditolak: ${rejecter.user.name}` : 'Ditolak / Dibatalkan',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: XCircle,
      iconClass: 'text-rose-500',
    }
  }

  const pendingRecipients = doc.recipients.filter(
    (r) => r.status === 'WAITING' || r.status === 'PENDING'
  )

  if (pendingRecipients.length === 0) {
    return {
      text: 'Semua TTD Selesai',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      iconClass: 'text-emerald-500',
    }
  }

  if (doc.sequential) {
    const active = [...pendingRecipients].sort(
      (a, b) => (a.signingOrder || 0) - (b.signingOrder || 0)
    )[0]
    const remaining = pendingRecipients.length - 1
    return {
      text: `Menunggu ${active.user.name}${remaining > 0 ? ` (+${remaining})` : ''}`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Clock,
      iconClass: 'text-amber-500',
    }
  }

  const first = pendingRecipients[0]
  const remaining = pendingRecipients.length - 1
  return {
    text: `Menunggu ${first.user.name}${remaining > 0 ? ` (+${remaining})` : ''}`,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
    iconClass: 'text-amber-500',
  }
}

import DocumentDistributionChart from '@/components/dashboard/DocumentDistributionChart'
import PageHeaderBanner from '@/components/PageHeaderBanner'

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, avatarUrl: true },
  })

  if (currentUser?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [
    totalUsers,
    totalDocs,
    completedDocs,
    inProgressDocs,
    rejectedDocs,
    recentDocuments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.document.count({ where: { status: { not: 'DRAFT' } } }),
    prisma.document.count({ where: { status: 'COMPLETED' } }),
    prisma.document.count({
      where: {
        status: { in: ['PENDING', 'PARTIAL_SIGNED'] },
      },
    }),
    prisma.document.count({ where: { status: 'REJECTED' } }),
    prisma.document.findMany({
      where: { status: { not: 'DRAFT' } },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, email: true, department: true, avatarUrl: true } },
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
  ])

  // Total dokumen aktif untuk persentase statcards
  const activeTotalDocs = completedDocs + inProgressDocs + rejectedDocs || 1
  const completedPct = Number(((completedDocs / activeTotalDocs) * 100).toFixed(1))
  const inProgressPct = Number(((inProgressDocs / activeTotalDocs) * 100).toFixed(1))
  const rejectedPct = Number(((rejectedDocs / activeTotalDocs) * 100).toFixed(1))

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      {/* Header Panel Administrator Instansi */}
      <PageHeaderBanner
        title="Dashboard Administrator"
        subtitle="Ringkasan operasional dan pengawasan tanda tangan elektronik instansi."
        action={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Link
              href="/setting"
              title="Buka Pengaturan Profil"
              className="relative group block shrink-0"
            >
              <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-2 border-white/40 shadow-lg bg-[#00284d] text-white flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 overflow-hidden ring-4 ring-white/10 transition-transform duration-200 group-hover:scale-105">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(currentUser.name)
                )}
              </div>
            </Link>

            <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1 border-t sm:border-t-0 sm:border-l border-white/15 pt-3 sm:pt-0 sm:pl-6">
              <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">Total Dokumen Terkelola</p>
              <p className="text-3xl font-black text-white leading-none">{totalDocs}</p>
              <Link
                href="/admin/documents"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-white transition-colors mt-0.5"
              >
                Buka Monitoring <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        }
      />

      {/* 4 Stat Cards Modern Sesuai Kebutuhan Instansi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Karyawan (Dapat Diklik ke Manajemen Karyawan) */}
        <Link
          href="/admin/users"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-700 transition-colors">
                Total Karyawan
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-50 text-[#003b73] rounded-xl ring-1 ring-blue-100 group-hover:bg-[#003b73] group-hover:text-white transition-all">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Pegawai terdaftar</span>
            <span className="font-bold text-[#003b73] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Kelola Pegawai <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Card 2: Dokumen Dalam Proses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Dokumen Dalam Proses
              </p>
              <p className="text-3xl font-black text-amber-600 mt-1 tracking-tight">{inProgressDocs}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl ring-1 ring-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Menunggu tanda tangan</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200/60">
              {inProgressPct}% antrean
            </span>
          </div>
        </div>

        {/* Card 3: Dokumen Selesai / Diterima */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Dokumen Selesai
              </p>
              <p className="text-3xl font-black text-emerald-600 mt-1 tracking-tight">{completedDocs}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl ring-1 ring-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Ditandatangani penuh</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
              {completedPct}% sukses
            </span>
          </div>
        </div>

        {/* Card 4: Dokumen Ditolak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Dokumen Ditolak
              </p>
              <p className="text-3xl font-black text-rose-600 mt-1 tracking-tight">{rejectedDocs}</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl ring-1 ring-rose-100">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Dibatalkan / Ditolak</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200/60">
              {rejectedPct}% ditolak
            </span>
          </div>
        </div>
      </div>

      {/* Bagian Statistik Bawah Statcards: Diagram Distribusi (Kiri) & Audit Feed Terkini (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* FITUR 1: Diagram Status Distribusi Dokumen (Interaktif dengan Tooltip & Hover) */}
        <div className="lg:col-span-5">
          <DocumentDistributionChart
            totalDocs={totalDocs}
            completedDocs={completedDocs}
            inProgressDocs={inProgressDocs}
            rejectedDocs={rejectedDocs}
          />
        </div>

        {/* FITUR 2: Tabel Aktivitas Dokumen Terbaru (Real-time Audit Feed) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-[#003b73] rounded-xl">
                <FileClock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Aktivitas Dokumen Terbaru
              </h2>
            </div>

            <Link
              href="/admin/documents"
              className="text-xs font-bold text-[#003b73] hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
            >
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentDocuments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Belum ada transaksi dokumen</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dokumen yang diunggah dan diproses akan tercatat otomatis di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-3">Nama Dokumen</th>
                    <th className="py-3 px-3">Pengunggah</th>
                    <th className="py-3 px-3">Posisi Terakhir Penandatangan</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Waktu Pembaruan</th>
                    <th className="py-3 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDocuments.map((doc, idx) => {
                    const signerInfo = getSignerPosition(doc)
                    const IconPosition = signerInfo.icon

                    // Selang-seling warna putih dan biru cerah (#f0f7ff)
                    const rowBg = idx % 2 === 1 ? 'bg-[#f0f7ff]' : 'bg-white'

                    return (
                      <tr key={doc.id} className={`${rowBg} hover:bg-blue-100/60 transition-colors`}>
                        {/* 1. Nama Dokumen */}
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2 max-w-[190px]">
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800" title={doc.title}>
                                {doc.title}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                ID: {doc.id.substring(0, 8).toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Pengunggah (Uploader) */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 max-w-[140px]">
                            <div className="w-6 h-6 rounded-full bg-[#003b73] text-white flex items-center justify-center font-bold text-[9px] shrink-0 overflow-hidden shadow-xs border border-white/20">
                              {doc.sender?.avatarUrl ? (
                                <img src={doc.sender.avatarUrl} alt={doc.sender?.name || 'User'} className="w-full h-full object-cover" />
                              ) : (
                                getInitials(doc.sender?.name || 'User')
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">
                                {doc.sender?.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {doc.sender?.department || doc.sender?.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 3. Posisi Terakhir Penandatangan */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 max-w-[170px]">
                            <IconPosition className={`w-3.5 h-3.5 shrink-0 ${signerInfo.iconClass}`} />
                            <span
                              className={`text-[11px] font-semibold truncate ${
                                signerInfo.iconClass.includes('emerald')
                                  ? 'text-emerald-700'
                                  : signerInfo.iconClass.includes('rose')
                                  ? 'text-rose-700'
                                  : 'text-slate-700'
                              }`}
                              title={signerInfo.text}
                            >
                              {signerInfo.text}
                            </span>
                          </div>
                        </td>

                        {/* 4. Status Badge */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
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
                              ? 'Completed'
                              : doc.status === 'REJECTED'
                              ? 'Rejected'
                              : doc.status === 'PARTIAL_SIGNED'
                              ? 'Partial Signed'
                              : 'Pending'}
                          </span>
                        </td>

                        {/* 5. Waktu Pembaruan */}
                        <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                          {formatDateIndo(doc.updatedAt)}
                        </td>

                        {/* 6. Aksi */}
                        <td className="py-3 px-2 text-center">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-[#003b73] hover:text-white text-slate-700 rounded-lg text-[10px] font-bold transition-all shadow-2xs"
                            title="Buka dokumen"
                          >
                            Detail <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
