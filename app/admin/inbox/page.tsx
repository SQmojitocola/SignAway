'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Inbox,
  UserPlus,
  HelpCircle,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  RefreshCw,
  Mail,
  UserCheck,
  Check,
  RotateCcw,
  ArrowUpRight,
  Filter
} from 'lucide-react'
import PageHeaderBanner from '@/components/PageHeaderBanner'

interface AdminMessageItem {
  id: string
  email: string
  name: string | null
  purpose: 'CREATE_ACCOUNT' | 'REPORT_ISSUE'
  message: string | null
  status: 'PENDING' | 'RESOLVED'
  createdAt: string
  updatedAt: string
}

export default function AdminInboxPage() {
  const [messages, setMessages] = useState<AdminMessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tabFilter, setTabFilter] = useState<'ALL' | 'PENDING' | 'CREATE_ACCOUNT' | 'REPORT_ISSUE' | 'RESOLVED'>('ALL')
  const [selectedMessage, setSelectedMessage] = useState<AdminMessageItem | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/inbox')
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
      } else {
        showToast('error', data.error || 'Gagal memuat pesan inbox.')
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan saat memuat pesan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Update Status Pesan (PENDING <-> RESOLVED)
  const handleUpdateStatus = async (id: string, newStatus: 'PENDING' | 'RESOLVED') => {
    setActionLoadingId(id)
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', data.message || 'Status pesan berhasil diperbarui.')
        setMessages((prev) =>
          prev.map((msg) => (msg.id === id ? { ...msg, status: newStatus } : msg))
        )
        if (selectedMessage?.id === id) {
          setSelectedMessage((prev) => (prev ? { ...prev, status: newStatus } : null))
        }
      } else {
        showToast('error', data.error || 'Gagal mengubah status pesan.')
      }
    } catch {
      showToast('error', 'Terjadi kesalahan sistem saat memperbarui status.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Hapus Pesan
  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pesan ini dari Inbox?')) return

    setActionLoadingId(id)
    try {
      const res = await fetch(`/api/admin/inbox?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', data.message || 'Pesan berhasil dihapus.')
        setMessages((prev) => prev.filter((msg) => msg.id !== id))
        if (selectedMessage?.id === id) {
          setSelectedMessage(null)
        }
      } else {
        showToast('error', data.error || 'Gagal menghapus pesan.')
      }
    } catch {
      showToast('error', 'Terjadi kesalahan sistem saat menghapus pesan.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Tab filter
      if (tabFilter === 'PENDING' && msg.status !== 'PENDING') return false
      if (tabFilter === 'RESOLVED' && msg.status !== 'RESOLVED') return false
      if (tabFilter === 'CREATE_ACCOUNT' && msg.purpose !== 'CREATE_ACCOUNT') return false
      if (tabFilter === 'REPORT_ISSUE' && msg.purpose !== 'REPORT_ISSUE') return false

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchEmail = msg.email.toLowerCase().includes(q)
        const matchName = msg.name?.toLowerCase().includes(q) || false
        const matchMsg = msg.message?.toLowerCase().includes(q) || false
        return matchEmail || matchName || matchMsg
      }

      return true
    })
  }, [messages, tabFilter, search])

  // Hitungan statistik
  const stats = useMemo(() => {
    const total = messages.length
    const pending = messages.filter((m) => m.status === 'PENDING').length
    const createAcc = messages.filter((m) => m.purpose === 'CREATE_ACCOUNT').length
    const issues = messages.filter((m) => m.purpose === 'REPORT_ISSUE').length
    const resolved = messages.filter((m) => m.status === 'RESOLVED').length
    return { total, pending, createAcc, issues, resolved }
  }, [messages])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeaderBanner
        title="Inbox Pesan & Permohonan"
        subtitle="Kelola permintaan pembuatan akun baru dan laporan kendala login dari pengguna."
      />

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm animate-in fade-in duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{toastMsg.text}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* 📍 STATCARDS SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pesan */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Masuk</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-50 text-[#003b73] rounded-xl ring-1 ring-blue-100">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        {/* Belum Ditangani */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Perlu Tindakan</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{stats.pending}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl ring-1 ring-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Permohonan Akun */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Permohonan Akun</p>
            <p className="text-2xl sm:text-3xl font-black text-cyan-600 mt-1">{stats.createAcc}</p>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl ring-1 ring-cyan-100">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

        {/* Laporan Kendala */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Laporan Kendala</p>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">{stats.issues}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl ring-1 ring-rose-100">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 📍 FILTER BAR & TABS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs">
          <button
            onClick={() => setTabFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              tabFilter === 'ALL'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semua ({stats.total})
          </button>
          <button
            onClick={() => setTabFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              tabFilter === 'PENDING'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Perlu Tindakan ({stats.pending})
          </button>
          <button
            onClick={() => setTabFilter('CREATE_ACCOUNT')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              tabFilter === 'CREATE_ACCOUNT'
                ? 'bg-white text-cyan-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Permohonan Akun ({stats.createAcc})
          </button>
          <button
            onClick={() => setTabFilter('REPORT_ISSUE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              tabFilter === 'REPORT_ISSUE'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Kendala Login ({stats.issues})
          </button>
          <button
            onClick={() => setTabFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              tabFilter === 'RESOLVED'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Selesai ({stats.resolved})
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari email, nama, pesan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#003b73] focus:bg-white"
            />
          </div>

          <button
            onClick={fetchMessages}
            title="Muat ulang data"
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 📍 TABEL INBOX DENGAN WARNA SELANG SELING (ZEBRA STRIPING) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tujuan & Pengirim</th>
                <th className="py-3.5 px-4">Email / Gmail</th>
                <th className="py-3.5 px-4">Detail Pesan / Catatan</th>
                <th className="py-3.5 px-4">Waktu Diterima</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#003b73]" />
                    <p>Memuat inbox pesan...</p>
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada pesan yang sesuai</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Belum ada permohonan atau laporan baru yang masuk ke inbox.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMessages.map((msg, idx) => {
                  const isAccount = msg.purpose === 'CREATE_ACCOUNT'
                  const isResolved = msg.status === 'RESOLVED'
                  const formattedDate = new Date(msg.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  // Selang-seling warna putih dan biru cerah (#f0f7ff)
                  const rowBg = idx % 2 === 1 ? 'bg-[#f0f7ff]' : 'bg-white'

                  return (
                    <tr
                      key={msg.id}
                      className={`${rowBg} hover:bg-blue-100/60 transition-colors cursor-pointer`}
                      onClick={() => setSelectedMessage(msg)}
                    >
                      {/* Tujuan & Pengirim */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isAccount
                                ? 'bg-cyan-100/80 text-cyan-800'
                                : 'bg-rose-100/80 text-rose-800'
                            }`}
                          >
                            {isAccount ? (
                              <UserPlus className="w-4 h-4" />
                            ) : (
                              <HelpCircle className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase mb-0.5 ${
                                isAccount
                                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {isAccount ? 'Permohonan Akun' : 'Kendala Login'}
                            </span>
                            <p className="font-bold text-slate-800">
                              {msg.name || 'Pengguna Baru'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={msg.email}>
                            {msg.email}
                          </span>
                        </div>
                      </td>

                      {/* Pesan */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-2 italic" title={msg.message || '-'}>
                          {msg.message || (isAccount ? 'Permohonan pendaftaran akun baru' : '-')}
                        </p>
                      </td>

                      {/* Waktu */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                            isResolved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isResolved ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Selesai
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Pending
                            </>
                          )}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Buatkan Akun (jika belum punya akun) */}
                          {isAccount && (
                            <Link
                              href={`/admin/users?quick_add=true&email=${encodeURIComponent(
                                msg.email
                              )}&name=${encodeURIComponent(msg.name || '')}`}
                              title="Buatkan akun di Manajemen Karyawan"
                              className="p-1.5 bg-[#003b73] hover:bg-blue-900 text-white rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold px-2"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Buat Akun</span>
                            </Link>
                          )}

                          {/* Toggle Selesai / Pending */}
                          <button
                            type="button"
                            disabled={actionLoadingId === msg.id}
                            onClick={() =>
                              handleUpdateStatus(msg.id, isResolved ? 'PENDING' : 'RESOLVED')
                            }
                            title={isResolved ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                              isResolved
                                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {isResolved ? (
                              <RotateCcw className="w-3.5 h-3.5" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            disabled={actionLoadingId === msg.id}
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Hapus pesan"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* 📍 MODAL DETAIL PESAN */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#003b73] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  {selectedMessage.purpose === 'CREATE_ACCOUNT' ? (
                    <UserPlus className="w-5 h-5 text-cyan-300" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-rose-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base">Detail Pesan Inbox</h3>
                  <p className="text-xs text-blue-100/70">
                    {selectedMessage.purpose === 'CREATE_ACCOUNT'
                      ? 'Permohonan Pendaftaran Akun Baru'
                      : 'Laporan Kendala Akses / Login'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Nama Pemohon</p>
                  <p className="text-slate-800 font-semibold mt-0.5 text-sm">
                    {selectedMessage.name || 'Tidak dicantumkan'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Email / Gmail</p>
                  <p className="text-blue-600 font-mono font-semibold mt-0.5 break-all">
                    {selectedMessage.email}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Waktu Pengiriman</p>
                  <p className="text-slate-700 font-medium mt-0.5">
                    {new Date(selectedMessage.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Status</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedMessage.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {selectedMessage.status === 'RESOLVED' ? 'Selesai' : 'Perlu Tindakan (Pending)'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-bold uppercase text-[10px] mb-1.5">
                  Isi Pesan / Laporan Kendala:
                </p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedMessage.message ||
                    (selectedMessage.purpose === 'CREATE_ACCOUNT'
                      ? 'Pengguna mengajukan permohonan pembuatan akun baru melalui tombol Hubungi Administrator di halaman login.'
                      : 'Tidak ada rincian pesan.')}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Pesan
                </button>

                <div className="flex items-center gap-2">
                  {selectedMessage.purpose === 'CREATE_ACCOUNT' && (
                    <Link
                      href={`/admin/users?quick_add=true&email=${encodeURIComponent(
                        selectedMessage.email
                      )}&name=${encodeURIComponent(selectedMessage.name || '')}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#003b73] hover:bg-blue-900 text-white font-bold rounded-xl transition-all shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Buat Akun Karyawan
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStatus(
                        selectedMessage.id,
                        selectedMessage.status === 'RESOLVED' ? 'PENDING' : 'RESOLVED'
                      )
                    }
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
                      selectedMessage.status === 'RESOLVED'
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedMessage.status === 'RESOLVED'
                      ? 'Tandai Belum Selesai'
                      : 'Tandai Telah Selesai'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
