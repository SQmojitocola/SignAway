'use client'

import { useState } from 'react'
import { Users, ShieldCheck, UserCheck, Search } from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  email: string
  role: 'STAFF' | 'ATASAN' | 'ADMIN'
  createdAt: string
  _count: { specimens: number; sentDocuments: number }
}

const roleBadge = {
  STAFF:  { label: 'Staff',   class: 'bg-slate-100 text-slate-700 border-slate-200' },
  ATASAN: { label: 'Atasan',  class: 'bg-blue-50 text-blue-700 border-blue-200' },
  ADMIN:  { label: 'Admin',   class: 'bg-purple-50 text-purple-700 border-purple-200' },
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

export default function AdminUsersClient({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    total: users.length,
    staff: users.filter(u => u.role === 'STAFF').length,
    atasan: users.filter(u => u.role === 'ATASAN').length,
    admin: users.filter(u => u.role === 'ADMIN').length,
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingId(userId)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as AdminUser['role'] } : u))
        setMessage({ type: 'success', text: data.message })
      } else {
        setMessage({ type: 'error', text: data.message || 'Gagal mengubah role.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' })
    } finally {
      setLoadingId(null)
      setTimeout(() => setMessage(null), 3500)
    }
  }

  return (
    <div className="space-y-6">
      {/* Kartu Metrik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Pengguna', value: counts.total, icon: Users, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Jumlah Staff', value: counts.staff, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Jumlah Atasan', value: counts.atasan, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Jumlah Admin', value: counts.admin, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{stat.label}</p>
                <h3 className="mt-2 text-3xl font-extrabold text-slate-800">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-2xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pesan Status */}
      {message && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold border ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabel Pengguna */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Daftar Pengguna Terdaftar ({filtered.length})</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / email..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Pengguna</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Spesimen TTD</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Dokumen</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Ubah Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">Tidak ada pengguna ditemukan.</td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1e4273] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-slate-400 text-[10px]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${roleBadge[user.role].class}`}>
                      {roleBadge[user.role].label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    {user._count.specimens > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <ShieldCheck className="h-3 w-3" /> Sudah Ada
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        Belum Merekam
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-slate-700 font-semibold">{user._count.sentDocuments}</span>
                    <span className="text-slate-400 ml-1">dokumen</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={user.role}
                      disabled={loadingId === user.id}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="STAFF">Staff</option>
                      <option value="ATASAN">Atasan</option>
                      <option value="ADMIN">Admin</option>
                    </select>
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
