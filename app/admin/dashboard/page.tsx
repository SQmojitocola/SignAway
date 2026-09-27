import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  FileText,
  FileCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [totalUsers, totalDocs, pendingProxies, approvedProxies, recentPending] = await Promise.all([
    prisma.user.count(),
    prisma.document.count(),
    prisma.proxySignRequest.count({ where: { status: 'PENDING' } }),
    prisma.proxySignRequest.count({ where: { status: 'APPROVED' } }),
    prisma.proxySignRequest.findMany({
      where: { status: 'PENDING' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, name: true, email: true, nip: true, department: true } },
        targetUser: { select: { id: true, name: true, email: true, nip: true, department: true } },
        document: { select: { id: true, title: true } },
      },
    }),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      <div>
        <h1 className="text-2xl font-extrabold text-[#003b73] tracking-tight">Dashboard Admin</h1>
        <p className="text-xs text-slate-500 mt-1">Ringkasan aktivitas platform tanda tangan digital SignAway Pro.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Link
          href="/admin/users"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-300 transition-all group"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
              Total Karyawan
            </p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalUsers}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </Link>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Dokumen</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalDocs}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <Link
          href="/admin/proxy-requests"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-amber-300 transition-all group"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
              Proxy Pending
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingProxies}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
            <FileCheck className="w-5 h-5" />
          </div>
        </Link>

        <Link
          href="/admin/proxy-requests"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-purple-300 transition-all group"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-purple-600 transition-colors">
              Proxy Disetujui
            </p>
            <p className="text-2xl font-black text-purple-600 mt-1">{approvedProxies}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* Section Permohonan Proxy Menunggu Persetujuan */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Permohonan Delegasi TTD Menunggu Verifikasi</h2>
              <p className="text-xs text-slate-400">Pengajuan proxy aktif yang memerlukan tindakan persetujuan admin.</p>
            </div>
          </div>
          <Link
            href="/admin/proxy-requests"
            className="text-xs font-bold text-[#003b73] hover:underline flex items-center gap-1"
          >
            Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentPending.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Semua permohonan proxy telah ditinjau</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tidak ada antrean persetujuan delegasi saat ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Dokumen</th>
                  <th className="py-3 px-4">Pemohon (Wakil)</th>
                  <th className="py-3 px-4">Target (Diwakilkan)</th>
                  <th className="py-3 px-4">Alasan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPending.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="truncate max-w-[200px]" title={req.document.title}>
                        {req.document.title}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{req.requestedBy.name}</p>
                      <p className="text-[10px] text-slate-400">{req.requestedBy.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{req.targetUser.name}</p>
                      <p className="text-[10px] text-slate-400">{req.targetUser.department || '-'}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="truncate max-w-[220px]" title={req.reason}>
                        {req.reason}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href="/admin/proxy-requests"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#003b73] text-white rounded-lg text-[11px] font-semibold hover:bg-[#002d58] transition-colors"
                      >
                        Tinjau <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
