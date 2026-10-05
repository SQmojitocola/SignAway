'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, AlertTriangle, X, Loader2 } from 'lucide-react'

interface CancelDocumentButtonProps {
  documentId: string
  documentTitle: string
  documentStatus: string
  variant?: 'table' | 'header'
  onSuccess?: () => void
}

export default function CancelDocumentButton({
  documentId,
  documentTitle,
  documentStatus,
  variant = 'table',
  onSuccess,
}: CancelDocumentButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('Terjadi kendala sistem pada alur penandatanganan.')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Tombol hanya aktif untuk dokumen yang sedang berjalan
  const isCancellable = ['PENDING', 'PARTIAL_SIGNED'].includes(documentStatus)
  if (!isCancellable) return null

  const handleCancel = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/admin/documents/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          reason: reason.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Gagal membatalkan proses penandatanganan.')
      }

      setIsOpen(false)
      if (onSuccess) {
        onSuccess()
      }
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {variant === 'table' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Batalkan Proses Penandatanganan (Admin)"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-bold hover:bg-rose-100 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
        >
          <Ban className="w-3 h-3 text-rose-600" />
          <span>Batalkan</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 text-xs font-bold transition-colors cursor-pointer shadow-md"
        >
          <Ban className="w-3.5 h-3.5 text-rose-400" />
          <span>Batalkan Proses TTD</span>
        </button>
      )}

      {/* Modal Dialog Konfirmasi */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-left font-sans animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl ring-1 ring-rose-100 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Batalkan Proses TTD?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tindakan Khusus Administrator Instansi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!loading) setIsOpen(false)
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Isi Detail & Peringatan */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Judul Dokumen</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5 break-words">{documentTitle}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Alasan Pembatalan <span className="text-slate-400 font-normal">(akan dicatat di riwayat dokumen)</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Misal: Terjadi kendala sistem / penempatan tanda tangan keliru..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-slate-800 bg-white"
                />
              </div>

              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl leading-relaxed">
                <p className="font-bold text-[11px] flex items-center gap-1.5 text-amber-800">
                  <span>⚠️</span> Perhatian:
                </p>
                <p className="text-[11px] mt-0.5 text-amber-800">
                  Alur tanda tangan yang tersisa akan langsung dihentikan dan status dokumen berubah menjadi <strong>Ditolak / Dibatalkan</strong>.
                </p>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Membatalkan...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Ya, Batalkan Dokumen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
