'use client'

import { useState, useEffect } from 'react'
import { ShieldAlert, UserCheck, Send, X } from 'lucide-react'

interface UserOption {
  id: string
  name: string
  email: string
  department: string | null
}

interface ProxyRequestModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentTitle: string
  onSuccess?: () => void
}

export default function ProxyRequestModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  onSuccess,
}: ProxyRequestModalProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [targetUserId, setTargetUserId] = useState('')
  const [reason, setReason] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Ambil daftar karyawan untuk dipilih siapa yang ingin diwakilkan TTD-nya
  useEffect(() => {
    if (!isOpen) return

    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const res = await fetch('/api/users/list')
        if (res.ok) {
          const data = await res.json()
          setUsers(data.users || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/proxy-requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          targetUserId,
          reason,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal mengirim pengajuan proxy.')
      } else {
        alert('Pengajuan perwakilan TTD berhasil dikirim! Menunggu persetujuan Admin.')
        if (onSuccess) onSuccess()
        onClose()
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#003b73]">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold">Ajukan Mewakili TTD (Proxy)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-2">
          Ajukan permohonan ke Administrator untuk menandatangani dokumen ini atas nama pejabat/rekan kerja yang berhalangan.
        </p>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Dokumen</label>
            <input
              type="text"
              disabled
              value={documentTitle}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Karyawan / Pejabat Yang Diwakili
            </label>
            <select
              required
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#003b73] bg-white text-slate-800 font-medium"
            >
              <option value="">-- Pilih Pejabat / Karyawan --</option>
              {loadingUsers ? (
                <option disabled>Memuat data karyawan...</option>
              ) : (
                users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.department || 'Umum'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Alasan Pengajuan Permohonan
            </label>
            <textarea
              required
              rows={3}
              placeholder="Contoh: Bapak Santos sedang dinas luar kota dan menugaskan saya untuk menandatangani dokumen ini."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#003b73] text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003b73] hover:bg-blue-900 text-xs font-bold text-white shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Kirim...' : 'Kirim Ke Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}