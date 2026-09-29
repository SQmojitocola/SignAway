'use client'

import { useState } from 'react'
import {
  X,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  HelpCircle,
  FileQuestion,
  UserPlus
} from 'lucide-react'

interface ContactAdminModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
  initialPurpose?: 'CREATE_ACCOUNT' | 'REPORT_ISSUE'
}

export default function ContactAdminModal({
  isOpen,
  onClose,
  initialEmail = '',
  initialPurpose = 'CREATE_ACCOUNT',
}: ContactAdminModalProps) {
  const [email, setEmail] = useState(initialEmail)
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState<'CREATE_ACCOUNT' | 'REPORT_ISSUE'>(initialPurpose)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !email.includes('@')) {
      setError('Silakan masukkan alamat Gmail/Email yang valid.')
      return
    }

    if (purpose === 'REPORT_ISSUE' && !message.trim()) {
      setError('Harap tuliskan detail kendala atau pesan laporan Anda.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          purpose,
          message: message.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Gagal mengirim permohonan.')
      } else {
        setIsSuccess(true)
      }
    } catch {
      setError('Terjadi kendala jaringan. Silakan coba kembali.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetAndClose = () => {
    setError(null)
    setIsSuccess(false)
    setMessage('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="relative bg-gradient-to-r from-[#003b73] to-[#1e4273] px-6 py-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md ring-1 ring-white/20">
              {purpose === 'CREATE_ACCOUNT' ? (
                <UserPlus className="w-5 h-5 text-cyan-300" />
              ) : (
                <HelpCircle className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Hubungi Administrator</h2>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Layanan bantuan permohonan akun & pelaporan kendala login
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content / Body Modal */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Permohonan Berhasil Terkirim!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Pesan Anda telah masuk ke kotak inbox Administrator. Tim admin akan segera memproses
                  {purpose === 'CREATE_ACCOUNT'
                    ? ' pembuatan akun baru Anda.'
                    : ' penanganan kendala yang Anda laporkan.'}
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-6 py-2.5 bg-[#003b73] hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                >
                  Tutup Jendela
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Input Email / Gmail */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alamat Gmail / Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama.anda@gmail.com atau email instansi"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-[#003b73] focus:bg-white focus:ring-1 focus:ring-[#003b73]"
                  />
                </div>
              </div>

              {/* Input Nama Lengkap (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap Pemohon <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Prasetyo"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-[#003b73] focus:bg-white focus:ring-1 focus:ring-[#003b73]"
                  />
                </div>
              </div>

              {/* Dropdown Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tujuan Permohonan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FileQuestion className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={purpose}
                    onChange={(e) =>
                      setPurpose(e.target.value as 'CREATE_ACCOUNT' | 'REPORT_ISSUE')
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-8 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-[#003b73] focus:bg-white focus:ring-1 focus:ring-[#003b73] appearance-none cursor-pointer"
                  >
                    <option value="CREATE_ACCOUNT">Buatkan Akun Baru (Belum Memiliki Akun)</option>
                    <option value="REPORT_ISSUE">Laporkan Kendala / Masalah (Lupa Sandi, Error Login)</option>
                  </select>
                  <div className="absolute right-3.5 top-3 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Isian Pesan Laporan (Muncul otomatis jika pilih Laporkan atau catatan tambahan) */}
              {purpose === 'REPORT_ISSUE' ? (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-xs font-bold text-slate-700">
                    Pesan Laporan Kendala <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Jelaskan kendala Anda (contoh: Lupa kata sandi akun, akun dibekukan, atau tidak bisa login)..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800 outline-none transition-all focus:border-[#003b73] focus:bg-white focus:ring-1 focus:ring-[#003b73] resize-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Administrator akan menerima laporan ini beserta email Anda untuk pemulihan akses.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Catatan Tambahan <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Contoh: Unit kerja / Departemen Operasional Cabang..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800 outline-none transition-all focus:border-[#003b73] focus:bg-white focus:ring-1 focus:ring-[#003b73] resize-none"
                  />
                </div>
              )}

              {/* Tombol Kirim */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#003b73] hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim ke Administrator</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
