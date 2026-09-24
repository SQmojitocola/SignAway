'use client'

import { useState } from 'react'
import { FileText, Clock3, CheckCircle2, XCircle, Search, AlertTriangle } from 'lucide-react'

type DocStatus = 'DRAFT' | 'PENDING' | 'PARTIAL_SIGNED' | 'COMPLETED' | 'REJECTED'

interface AdminDocument {
  id: string
  title: string
  status: DocStatus
  createdAt: string
  updatedAt: string
  rejectReason?: string | null
  sender: { id: string; name: string; email: string }
  recipients: Array<{
    id: string
    status: 'WAITING' | 'PENDING' | 'SIGNED' | 'REJECTED'
    signingOrder: number | null
    user: { id: string; name: string; email: string }
  }>
}

const statusConfig: Record<DocStatus, { label: string; class: string; icon: React.ElementType }> = {
  DRAFT:          { label: 'Draft',              class: 'bg-slate-100 text-slate-600 border-slate-200',     icon: FileText },
  PENDING:        { label: 'Menunggu TTD',        class: 'bg-amber-50 text-amber-700 border-amber-200',      icon: Clock3 },
  PARTIAL_SIGNED: { label: 'Sebagian Ditandatangani', class: 'bg-blue-50 text-blue-700 border-blue-200',   icon: Clock3 },
  COMPLETED:      { label: 'Selesai',             class: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  REJECTED:       { label: 'Ditolak / Dibatalkan', class: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle },
}

type FilterTab = 'ALL' | DocStatus

export default function AdminDocumentsClient({ initialDocuments }: { initialDocuments: AdminDocument[] }) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL')
  const [search, setSearch] = useState('')
  const [voidId, setVoidId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [loadingVoid, setLoadingVoid] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filtered = documents.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.sender.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = activeFilter === 'ALL' || d.status === activeFilter
    return matchSearch && matchFilter
  })

  const counts = {
    ALL: documents.length,
    PENDING: documents.filter(d => d.status === 'PENDING').length,
    PARTIAL_SIGNED: documents.filter(d => d.status === 'PARTIAL_SIGNED').length,
    COMPLETED: documents.filter(d => d.status === 'COMPLETED').length,
    REJECTED: documents.filter(d => d.status === 'REJECTED').length,
  }

  const tabs: Array<{ key: FilterTab; label: string }> = [
    { key: 'ALL', label: `Semua (${counts.ALL})` },
    { key: 'PENDING', label: `Menunggu TTD (${counts.PENDING})` },
    { key: 'COMPLETED', label: `Selesai (${counts.COMPLETED})` },
    { key: 'REJECTED', label: `Ditolak (${counts.REJECTED})` },
  ]

  const handleVoid = async () => {
    if (!voidId || !voidReason.trim()) return
    setLoadingVoid(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/documents/${voidId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      })
      const data = await res.json()
      if (res.ok) {
        setDocuments(prev => prev.map(d => d.id === voidId ? { ...d, status: 'REJECTED' as DocStatus, rejectReason: `[DIBATALKAN ADMIN] ${voidReason}` } : d))
        setMessage({ type: 'success', text: data.message })
        setVoidId(null)
        setVoidReason('')
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' })
    } finally {
      setLoadingVoid(false)
      setTimeout(() => setMessage(null), 3500)
    }
  }

  return (
    <div className="space-y-5">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeFilter === tab.key
                ? 'bg-[#1e4273] text-white border-[#1e4273] shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pesan Status */}
      {message && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabel Dokumen */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Dokumen Tersimpan ({filtered.length})</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul / pengirim..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Dokumen</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Pengirim</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Penerima</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">Tidak ada dokumen ditemukan.</td>
                </tr>
              ) : filtered.map(doc => {
                const cfg = statusConfig[doc.status]
                const StatusIcon = cfg.icon
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-800 max-w-[180px] truncate">{doc.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.id.slice(0, 12)}...</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-700">{doc.sender.name}</p>
                      <p className="text-[10px] text-slate-400">{doc.sender.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cfg.class}`}>
                        <StatusIcon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {doc.recipients.map(r => (
                          <span
                            key={r.id}
                            title={`${r.user.name} — ${r.status}`}
                            className={`inline-flex rounded-full w-7 h-7 items-center justify-center text-[10px] font-bold border shrink-0 ${
                              r.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              r.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {r.user.name.charAt(0).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {doc.status !== 'COMPLETED' && doc.status !== 'REJECTED' && (
                        <button
                          onClick={() => { setVoidId(doc.id); setVoidReason('') }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100 transition-colors"
                        >
                          <AlertTriangle className="h-3 w-3" /> Batalkan
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfirmasi Void */}
      {voidId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200/80 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Batalkan Dokumen</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat diurungkan.</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Pembatalan *</label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Tuliskan alasan pembatalan dokumen oleh administrator..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-red-400 resize-none h-20"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setVoidId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                disabled={loadingVoid || !voidReason.trim()}
                onClick={handleVoid}
                className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loadingVoid ? 'Memproses...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
