'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  UserPlus,
  Search,
  KeyRound,
  Download,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Shield,
  RefreshCw,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import PageHeaderBanner from '@/components/PageHeaderBanner'

export type UserStatusType = 'ACTIVE' | 'FROZEN' | 'DELETED'

interface UserData {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'KARYAWAN'
  nip: string | null
  department: string | null
  status: UserStatusType
  isActive: boolean
  createdAt: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatusType>('ALL')

  // Notifikasi Feedback
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modal Tambah Karyawan
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: '',
    nip: '',
    department: 'Divisi Umum',
    role: 'KARYAWAN' as 'ADMIN' | 'KARYAWAN',
  })

  // Modal Edit / Customize Karyawan
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    nip: '',
    department: '',
    role: 'KARYAWAN' as 'ADMIN' | 'KARYAWAN',
    status: 'ACTIVE' as UserStatusType,
    newPassword: '',
  })

  // Modal Hapus Karyawan
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users/list')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error('Fetch users error:', err)
      setToastMsg({ type: 'error', text: 'Gagal memuat daftar karyawan dari server.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Auto-dismiss toast setelah 4 detik
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMsg])

  // Filter Karyawan Berdasarkan Pencarian dan Tab Status
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.nip && u.nip.includes(search)) ||
        (u.department && u.department.toLowerCase().includes(search.toLowerCase()))

      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [users, search, statusFilter])

  // Ringkasan Jumlah Status
  const statusCounts = useMemo(() => {
    return {
      all: users.length,
      active: users.filter((u) => u.status === 'ACTIVE').length,
      frozen: users.filter((u) => u.status === 'FROZEN').length,
      deleted: users.filter((u) => u.status === 'DELETED').length,
    }
  }, [users])

  // 1. Handler Tambah Karyawan Baru
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError('')

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFormData),
      })

      const data = await res.json()

      if (!res.ok) {
        setModalError(data.error || 'Gagal menambahkan karyawan.')
      } else {
        setIsCreateModalOpen(false)
        setCreateFormData({
          name: '',
          email: '',
          password: '',
          nip: '',
          department: 'Divisi Umum',
          role: 'KARYAWAN',
        })
        setToastMsg({ type: 'success', text: `Karyawan ${data.user.name} berhasil didaftarkan!` })
        fetchUsers()
      }
    } catch {
      setModalError('Terjadi kesalahan jaringan.')
    } finally {
      setSubmitting(false)
    }
  }

  // 2. Buka Modal Edit Karyawan
  const openEditModal = (user: UserData) => {
    setEditingUser(user)
    setEditFormData({
      name: user.name,
      email: user.email,
      nip: user.nip || '',
      department: user.department || '',
      role: user.role,
      status: user.status,
      newPassword: '',
    })
    setModalError('')
    setIsEditModalOpen(true)
  }

  // 3. Handler Simpan Perubahan Edit Karyawan (Customize)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setSubmitting(true)
    setModalError('')

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: editFormData.name,
          email: editFormData.email,
          nip: editFormData.nip,
          department: editFormData.department,
          role: editFormData.role,
          status: editFormData.status,
          password: editFormData.newPassword.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setModalError(data.error || 'Gagal memperbarui data karyawan.')
      } else {
        setIsEditModalOpen(false)
        setToastMsg({ type: 'success', text: `Data karyawan ${editingUser.name} berhasil diperbarui!` })
        fetchUsers()
      }
    } catch {
      setModalError('Terjadi kesalahan jaringan saat menyimpan.')
    } finally {
      setSubmitting(false)
    }
  }

  // 4. Quick Toggle Status (Aktifkan <-> Bekukan)
  const handleQuickStatusToggle = async (user: UserData) => {
    const nextStatus: UserStatusType = user.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE'
    const statusLabel = nextStatus === 'ACTIVE' ? 'diaktifkan' : 'dibekukan'

    if (!confirm(`Apakah Anda yakin ingin mengubah status ${user.name} menjadi ${statusLabel}?`)) {
      return
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          status: nextStatus,
        }),
      })

      if (res.ok) {
        setToastMsg({ type: 'success', text: `Status ${user.name} berhasil diubah menjadi ${nextStatus === 'ACTIVE' ? 'Aktif' : 'Dibekukan'}.` })
        fetchUsers()
      } else {
        const data = await res.json()
        setToastMsg({ type: 'error', text: data.error || 'Gagal mengubah status karyawan.' })
      }
    } catch {
      setToastMsg({ type: 'error', text: 'Terjadi kesalahan jaringan.' })
    }
  }

  // 5. Buka Modal Hapus Karyawan
  const openDeleteModal = (user: UserData) => {
    setDeletingUser(user)
    setModalError('')
    setIsDeleteModalOpen(true)
  }

  // 6. Handler Eksekusi Hapus Karyawan
  const handleDeleteUser = async () => {
    if (!deletingUser) return

    setSubmitting(true)
    setModalError('')

    try {
      const res = await fetch(`/api/admin/users?id=${deletingUser.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setModalError(data.error || 'Gagal menghapus karyawan.')
      } else {
        setIsDeleteModalOpen(false)
        setToastMsg({ type: 'success', text: data.message || `Karyawan ${deletingUser.name} berhasil dihapus.` })
        fetchUsers()
      }
    } catch {
      setModalError('Terjadi kesalahan jaringan saat menghapus.')
    } finally {
      setSubmitting(false)
    }
  }

  // 7. Handler Generate Random Password
  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$'
    let generated = ''
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setEditFormData((prev) => ({ ...prev, newPassword: generated }))
  }

  // 8. Handler Export Excel (.xlsx) Menggunakan SheetJS (XLSX)
  const handleExportExcel = () => {
    if (filteredUsers.length === 0) {
      alert('Tidak ada data karyawan yang sesuai untuk diunduh.')
      return
    }

    const excelRows = filteredUsers.map((u, idx) => ({
      'No': idx + 1,
      'Nama Karyawan': u.name,
      'Email': u.email,
      'NIP': u.nip || '-',
      'Departemen': u.department || 'Umum',
      'Role Akses': u.role === 'ADMIN' ? 'Administrator' : 'Karyawan',
      'Status Akun':
        u.status === 'ACTIVE' ? 'Aktif' : u.status === 'FROZEN' ? 'Dibekukan' : 'Dihapus',
      'Tanggal Terdaftar': new Date(u.createdAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      'Waktu Registrasi': new Date(u.createdAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }))

    const worksheet = XLSX.utils.json_to_sheet(excelRows)

    // Pengaturan lebar kolom
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 26 }, // Nama
      { wch: 32 }, // Email
      { wch: 18 }, // NIP
      { wch: 22 }, // Departemen
      { wch: 16 }, // Role
      { wch: 14 }, // Status
      { wch: 22 }, // Tanggal Terdaftar
      { wch: 16 }, // Waktu
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Karyawan')

    const dateFormatted = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `Data_Karyawan_SignAway_${dateFormatted}.xlsx`)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="p-1 hover:bg-black/5 rounded-lg ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner Card */}
      <PageHeaderBanner
        title="Manajemen Karyawan"
        subtitle="Kelola data akun, hak akses, status pegawai, dan unduh laporan."
        action={
          <div className="flex items-center gap-2">
            {/* Tombol Unduh Excel */}
            <button
              onClick={handleExportExcel}
              title="Unduh data tabel dalam format spreadsheet Excel (.xlsx)"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs transition-all backdrop-blur-xs shadow-xs active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Unduh Excel</span>
            </button>

            {/* Tombol Tambah Karyawan */}
            <button
              onClick={() => {
                setModalError('')
                setIsCreateModalOpen(true)
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Karyawan</span>
            </button>
          </div>
        }
      />

      {/* Baris Filter & Pencarian */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Filter Status */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-[#003b73] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({statusCounts.all})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aktif ({statusCounts.active})
          </button>
          <button
            onClick={() => setStatusFilter('FROZEN')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'FROZEN'
                ? 'bg-white text-amber-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dibekukan ({statusCounts.frozen})
          </button>
          <button
            onClick={() => setStatusFilter('DELETED')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'DELETED'
                ? 'bg-white text-rose-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dihapus ({statusCounts.deleted})
          </button>
        </div>

        {/* Input Pencarian */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, NIP, departemen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#003b73] focus:bg-white"
          />
        </div>
      </div>

      {/* Tabel Data Karyawan */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4">Karyawan</th>
                <th className="p-4">NIP & Departemen</th>
                <th className="p-4">Role Akses</th>
                <th className="p-4">Status Akun</th>
                <th className="p-4">Tgl Terdaftar</th>
                <th className="p-4 text-center">Aksi & Kustomisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#003b73]" />
                      <span>Memuat data karyawan...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    Tidak ada data karyawan yang sesuai dengan kriteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isDeleted = user.status === 'DELETED'
                  const isFrozen = user.status === 'FROZEN'
                  const isActive = user.status === 'ACTIVE'

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDeleted ? 'bg-slate-50/40 opacity-75' : isFrozen ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Nama & Email */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs shrink-0 ${
                              isDeleted
                                ? 'bg-slate-300 text-slate-600'
                                : isFrozen
                                ? 'bg-amber-500 text-white'
                                : 'bg-[#003b73] text-white'
                            }`}
                          >
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 flex items-center gap-1.5">
                              {user.name}
                              {user.role === 'ADMIN' && (
                                <span title="Administrator">
                                  <Shield className="w-3 h-3 text-[#003b73]" />
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* NIP & Departemen */}
                      <td className="p-4">
                        <p className="font-semibold text-slate-700">{user.nip || '-'}</p>
                        <p className="text-[10px] text-slate-400">{user.department || 'Umum'}</p>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Status Akun */}
                      <td className="p-4">
                        {isActive && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Aktif
                          </span>
                        )}
                        {isFrozen && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Lock className="w-3 h-3 text-amber-600" />
                            Dibekukan
                          </span>
                        )}
                        {isDeleted && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            Dihapus
                          </span>
                        )}
                      </td>

                      {/* Tanggal Pendaftaran */}
                      <td className="p-4 text-slate-500 text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Aksi */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Edit / Customize */}
                          <button
                            title="Edit Data & Customize Password"
                            onClick={() => openEditModal(user)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-[#003b73] transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Quick Toggle Bekukan / Aktifkan */}
                          {!isDeleted && (
                            <button
                              title={isActive ? 'Bekukan Akun Karyawan' : 'Aktifkan Kembali Akun Karyawan'}
                              onClick={() => handleQuickStatusToggle(user)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isActive
                                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {isActive ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Tombol Hapus */}
                          <button
                            title="Hapus Karyawan"
                            onClick={() => openDeleteModal(user)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all cursor-pointer"
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

      {/* MODAL 1: TAMBAH KARYAWAN BARU */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-[#003b73] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#003b73]" />
                Tambah Karyawan Baru
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">NIP / NIK</label>
                  <input
                    type="text"
                    placeholder="12345678"
                    value={createFormData.nip}
                    onChange={(e) => setCreateFormData({ ...createFormData, nip: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Departemen</label>
                  <input
                    type="text"
                    placeholder="Pengadaan / IT"
                    value={createFormData.department}
                    onChange={(e) => setCreateFormData({ ...createFormData, department: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Perusahaan</label>
                <input
                  type="email"
                  required
                  placeholder="budi@surveyor.co.id"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Default Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter..."
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Role Akses</label>
                <select
                  value={createFormData.role}
                  onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value as 'ADMIN' | 'KARYAWAN' })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73] bg-white cursor-pointer"
                >
                  <option value="KARYAWAN">Karyawan (Signer / User)</option>
                  <option value="ADMIN">Administrator (Hak Akses Penuh)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#003b73] text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT & CUSTOMIZE KARYAWAN (PASSWORD, USERNAME, ATRIBUT, STATUS) */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#003b73] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#003b73]" />
                  Kustomisasi Karyawan
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ubah atribut profil, status keaktifan, dan password untuk <strong>{editingUser.name}</strong>.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3.5">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap (Username Akun)
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Perusahaan</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                />
              </div>

              {/* NIP & Departemen */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">NIP / NIK</label>
                  <input
                    type="text"
                    placeholder="12345678"
                    value={editFormData.nip}
                    onChange={(e) => setEditFormData({ ...editFormData, nip: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Departemen</label>
                  <input
                    type="text"
                    placeholder="Operasional / SDM"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Role Hak Akses</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, role: e.target.value as 'ADMIN' | 'KARYAWAN' })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73] bg-white cursor-pointer"
                  >
                    <option value="KARYAWAN">Karyawan (Signer / User)</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Keaktifan</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value as UserStatusType })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73] bg-white cursor-pointer"
                  >
                    <option value="ACTIVE">Aktif (Dapat Login & Tanda Tangan)</option>
                    <option value="FROZEN">Dibekukan (Akses Terkunci Sementara)</option>
                    <option value="DELETED">Dihapus (Dinonaktifkan Permanen)</option>
                  </select>
                </div>
              </div>

              {/* Kustomisasi Password Baru */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    Kustomisasi Password Baru (Opsional)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[10px] font-bold text-[#003b73] hover:underline cursor-pointer"
                  >
                    + Buat Otomatis
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Kosongkan jika tidak ingin mengganti password..."
                  value={editFormData.newPassword}
                  onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#003b73]"
                />
                <p className="text-[10px] text-slate-400">
                  Jika diisi, password akun karyawan akan langsung diperbarui ke password baru ini.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#003b73] text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: KONFIRMASI HAPUS KARYAWAN */}
      {isDeleteModalOpen && deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Hapus Akun Karyawan?</h3>
                <p className="text-[11px] text-slate-500">Tindakan ini memerlukan konfirmasi admin.</p>
              </div>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <p className="text-slate-700">
                Akun: <strong className="text-slate-900">{deletingUser.name}</strong> ({deletingUser.email})
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Jika karyawan ini memiliki riwayat pengesahan dokumen, akun akan ditandai dengan status{' '}
                <strong>Dihapus</strong> dan akses login dinonaktifkan demi mempertahankan validitas hukum sertifikat digital dan audit trail dokumen.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus Karyawan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}