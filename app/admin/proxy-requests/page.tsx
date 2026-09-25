'use client'

import { useState, useEffect } from 'react'
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowRight,
  FileText,
  UserCheck,
  AlertCircle,
} from 'lucide-react'

interface ProxyRequestData {
  id: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionNote: string | null
  createdAt: string
  document: {
    id: string
    title: string
    status: string
  }
  requestedBy: {
    id: string
    name: string
    email: string
    nip: string | null
    department: string | null
  }
  targetUser: {
    id: string
    name: string
    email: string
    nip: string | null
    department: string | null
  }
  approvedBy: {
    id: string
    name: string
  } | null
}

export default function ProxyRequestsPage() {
  const [requests, setRequests] = useState<ProxyRequestData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<ProxyRequestData | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/proxy-requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleAction = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/proxy-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          status,
          rejectionNote: status === 'REJECTED' ? rejectionNote : null,
        }),
      })

      if (res.ok) {
        setSelectedRequest(null)
        setRejectionNote('')
        fetchRequests()
      } else {
        alert('Gagal memproses permohonan.')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan jaringan.')
    } finally {
      setProcessing(false)
    }
  }

  const filteredRequests = requests.filter(
    (r) =>
      r.document.title.toLowerCase().includes(search.toLowerCase()) ||
      r.requestedBy.name.toLowerCase().includes(search.toLowerCase()) ||
      r.targetUser.name.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#003b73] tracking-tight">
          Persetujuan Delegasi TTD (Proxy)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tinjau dan beri persetujuan izin perwakilan tanda tangan antar karyawan PT Surveyor Indonesia.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Menunggu Persetujuan</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Disetujui</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ditolak</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{rejectedCount}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari dokumen, nama pemohon, atau nama target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#003b73] focus:bg-white"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Total: <strong className="text-slate-800">{filteredRequests.length}</strong> Pengajuan
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4">Dokumen</th>
                <th className="p-4">Pemohon (Mewakili)</th>
                <th className="p-4">Target (Diwakili)</th>
                <th className="p-4">Alasan</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    Memuat data pengajuan...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    Tidak ada pengajuan proxy ditemukan.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800 line-clamp-1">{req.document.title}</p>
                          <p className="text-[10px] text-slate-400">ID: {req.document.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{req.requestedBy.name}</p>
                      <p className="text-[10px] text-slate-400">{req.requestedBy.department || 'Umum'}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{req.targetUser.name}</p>
                      <p className="text-[10px] text-slate-400">{req.targetUser.department || 'Umum'}</p>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="text-slate-600 line-clamp-2 italic">"{req.reason}"</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          req.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {req.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {req.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {req.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {req.status === 'PENDING' ? (
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-3 py-1.5 bg-[#003b73] hover:bg-blue-900 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                        >
                          Tinjau
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Oleh {req.approvedBy?.name || 'Admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail & Approval */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-extrabold text-[#003b73]">Tinjau Permohonan Proxy TTD</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verifikasi perwakilan penandatanganan dokumen sebelum memberikan izin.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Dokumen Target</span>
                <span className="font-bold text-slate-800">{selectedRequest.document.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Pemohon (Mewakili)</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.requestedBy.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target (Diwakili)</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.targetUser.name}</span>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Alasan Pengajuan</span>
                <p className="italic text-slate-700 bg-white p-2 rounded-lg border border-slate-200 mt-1">
                  "{selectedRequest.reason}"
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Catatan Penolakan (Opsional jika Menolak)
              </label>
              <textarea
                rows={2}
                placeholder="Berikan alasan jika pengajuan ini ditolak..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#003b73]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => handleAction(selectedRequest.id, 'REJECTED')}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
              >
                Tolak
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => handleAction(selectedRequest.id, 'APPROVED')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
              >
                Setujui Proxy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
