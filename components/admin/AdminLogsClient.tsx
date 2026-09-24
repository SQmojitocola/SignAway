'use client'

import { useState } from 'react'
import { ShieldCheck, Search, Monitor } from 'lucide-react'

interface AuditLog {
  id: string
  ipAddress: string
  signedAt: string
  document: { id: string; title: string; status: string }
  signer: { id: string; name: string; email: string }
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function AdminLogsClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [search, setSearch] = useState('')

  const filtered = initialLogs.filter(l =>
    l.signer.name.toLowerCase().includes(search.toLowerCase()) ||
    l.signer.email.toLowerCase().includes(search.toLowerCase()) ||
    l.document.title.toLowerCase().includes(search.toLowerCase()) ||
    l.ipAddress.includes(search)
  )

  return (
    <div className="space-y-5">
      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Total Kejadian</p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-800">{initialLogs.length}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Penandatangan Unik</p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-800">
                {new Set(initialLogs.map(l => l.signer.id)).size}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">IP Address Unik</p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-800">
                {new Set(initialLogs.map(l => l.ipAddress)).size}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50">
              <Monitor className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Riwayat Log Tanda Tangan</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Seluruh kejadian diverifikasi menggunakan SHA-256 Audit Trail.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, IP..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Header Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Penandatangan</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Dokumen</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Waktu Tanda Tangan</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Integritas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Belum ada riwayat log penandatanganan.
                  </td>
                </tr>
              ) : filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e4273] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {getInitials(log.signer.name)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{log.signer.name}</p>
                        <p className="text-[10px] text-slate-400">{log.signer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-700 max-w-[160px] truncate">{log.document.title}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{log.document.id.slice(0, 10)}...</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-mono text-slate-700">{log.ipAddress}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-slate-700">{formatDateTime(log.signedAt)}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> SHA-256 Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
