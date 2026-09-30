'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  ChevronDown,
  X,
  RotateCcw,
  Loader2,
  Filter,
} from 'lucide-react'

interface SenderOption {
  id: string
  name: string
  department: string | null
  avatarUrl: string | null
}

interface DocumentFilterBarProps {
  statusFilter: string
  senderFilter: string
  query: string
  counts: {
    allCount: number
    inProgressCount: number
    completedCount: number
    rejectedCount: number
  }
  senders: SenderOption[]
}

export default function DocumentFilterBar({
  statusFilter,
  senderFilter,
  query,
  counts,
  senders,
}: DocumentFilterBarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(query)

  const buildUrl = (params: {
    status?: string
    sender?: string
    q?: string
    page?: number
  }) => {
    const search = new URLSearchParams()
    const st = params.status !== undefined ? params.status : statusFilter
    const snd = params.sender !== undefined ? params.sender : senderFilter
    const q = params.q !== undefined ? params.q : query
    const pg = params.page !== undefined ? params.page : 1

    if (st && st !== 'ALL') search.set('status', st)
    if (snd && snd !== 'ALL') search.set('sender', snd)
    if (q && q.trim()) search.set('q', q.trim())
    if (pg > 1) search.set('page', pg.toString())

    const qs = search.toString()
    return `/admin/documents${qs ? `?${qs}` : ''}`
  }

  const navigateTo = (url: string) => {
    startTransition(() => {
      router.push(url)
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigateTo(buildUrl({ q: searchInput, page: 1 }))
  }

  const handleSenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSender = e.target.value
    navigateTo(buildUrl({ sender: selectedSender, page: 1 }))
  }

  const selectedSenderObj = senders.find((s) => s.id === senderFilter)
  const hasActiveFilters =
    statusFilter !== 'ALL' || (senderFilter && senderFilter !== 'ALL') || Boolean(query)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => navigateTo(buildUrl({ status: 'ALL', page: 1 }))}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#003b73] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({counts.allCount})
          </button>
          <button
            type="button"
            onClick={() => navigateTo(buildUrl({ status: 'IN_PROGRESS', page: 1 }))}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Dalam Proses ({counts.inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => navigateTo(buildUrl({ status: 'COMPLETED', page: 1 }))}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai ({counts.completedCount})
          </button>
          <button
            type="button"
            onClick={() => navigateTo(buildUrl({ status: 'REJECTED', page: 1 }))}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Ditolak ({counts.rejectedCount})
          </button>
        </div>

        {/* Filter Controls: Sender Dropdown & Search Form */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Dropdown Filter Pengunggah */}
          <div className="relative min-w-[200px] sm:w-56">
            <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={senderFilter}
              onChange={handleSenderChange}
              disabled={isPending}
              className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
            >
              <option value="ALL">Semua Pengunggah</option>
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.department ? `(${s.department})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Form Pencarian */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-[220px] sm:w-60 flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul dokumen..."
              className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  navigateTo(buildUrl({ q: '', page: 1 }))
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>

          {isPending && (
            <div className="flex items-center justify-center p-2 text-blue-600 shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter Aktif:
          </span>

          {selectedSenderObj && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
              <User className="w-3 h-3 text-blue-600" />
              <span>Pengunggah: {selectedSenderObj.name}</span>
              <button
                type="button"
                onClick={() => navigateTo(buildUrl({ sender: 'ALL', page: 1 }))}
                className="hover:bg-blue-200 rounded-full p-0.5 cursor-pointer transition-colors"
                title="Hapus filter pengunggah"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {statusFilter !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
              <span>
                Status:{' '}
                {statusFilter === 'IN_PROGRESS'
                  ? 'Dalam Proses'
                  : statusFilter === 'COMPLETED'
                  ? 'Selesai'
                  : 'Ditolak'}
              </span>
              <button
                type="button"
                onClick={() => navigateTo(buildUrl({ status: 'ALL', page: 1 }))}
                className="hover:bg-amber-200 rounded-full p-0.5 cursor-pointer transition-colors"
                title="Hapus filter status"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {query && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
              <Search className="w-3 h-3 text-slate-500" />
              <span>Cari: &ldquo;{query}&rdquo;</span>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  navigateTo(buildUrl({ q: '', page: 1 }))
                }}
                className="hover:bg-slate-200 rounded-full p-0.5 cursor-pointer transition-colors"
                title="Hapus kata kunci pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setSearchInput('')
              navigateTo('/admin/documents')
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors ml-auto cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Semua</span>
          </button>
        </div>
      )}
    </div>
  )
}
