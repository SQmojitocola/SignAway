'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, FileText, Home, Files } from 'lucide-react'

interface Recipient {
  id: string
  status: string
  user: { name: string; email: string }
}

interface Field {
  id: string
  pageNumber: number
  recipientId: string
}

interface DocumentData {
  id: string
  title: string
  createdAt: string
  status: string
  recipients: Recipient[]
  fields: Field[]
}

export default function UploadSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentId = searchParams.get('documentId')

  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!documentId) return

    fetch(`/api/documents/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
        setDoc(data.document || data)
      })
      .catch((err) => console.error('Fetch error:', err))
      .finally(() => setLoading(false))
  }, [documentId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-xs text-slate-500">
        Memuat konfirmasi pengiriman...
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-xs text-slate-500">
        Dokumen tidak ditemukan.
      </div>
    )
  }

  // Format Waktu Pengiriman
  const formattedDate = new Date(doc.createdAt).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100/80 p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl border border-slate-200/60 space-y-6">
        
        {/* Icon & Banner Sukses */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Dokumen Berhasil Dikirim!</h1>
          <p className="text-xs text-slate-500 max-w-xs">
            Dokumen Anda telah berhasil dikirim kepada semua pihak terkait untuk proses penandatanganan secara digital.
          </p>
        </div>

        {/* Card Ringkasan Dokumen */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
          
          {/* Baris Atas: Icon PDF & Judul Dokumen (Truncate agar tidak memotong UI) */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 font-bold text-[10px]">
              PDF
            </div>
            <div className="min-w-0 flex-1">
              {/* 📍 Truncate dipasang agar judul panjang tidak merusak tata letak */}
              <p className="text-xs font-bold text-slate-800 truncate" title={doc.title}>
                {doc.title}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">Dokumen berhasil diproses</p>
            </div>
          </div>

          <hr className="border-slate-200/80" />

          {/* Baris Bawah: Waktu Pengiriman & Status Sampingnya (Teks 'Metode TTD' Dihapus) */}
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="block text-[10px] text-slate-400 font-medium">Waktu Pengiriman:</span>
              <span className="font-semibold text-slate-700">{formattedDate}</span>
            </div>

            {/* 📍 Badge Status tampil rapi di samping Waktu Pengiriman */}
            <div>
              <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-700 border border-amber-500/30">
                Menunggu Tanda Tangan
              </span>
            </div>
          </div>
        </div>

        {/* Daftar Penandatangan */}
        <div className="space-y-3 pt-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            DAFTAR PENANDATANGAN ({doc.recipients?.length || 0} PIHAK)
          </h2>

          <div className="space-y-2">
            {doc.recipients?.map((recipient, idx) => {
              const recipientFields = doc.fields?.filter((f) => f.recipientId === recipient.id) || []
              const pageNumbers = Array.from(new Set(recipientFields.map((f) => f.pageNumber)))

              return (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{recipient.user?.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {recipient.user?.email}{' '}
                        {pageNumbers.length > 0 && (
                          <span className="text-blue-600 font-medium">
                            · Halaman {pageNumbers.join(', ')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold ${
                      recipient.status === 'SIGNED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : recipient.status === 'WAITING' || recipient.status === 'PENDING'
                        ? 'bg-slate-200/80 text-slate-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {recipient.status === 'SIGNED'
                      ? 'Sudah TTD'
                      : idx === 0
                      ? 'Menunggu Tanda Tangan'
                      : 'Menunggu Giliran'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tombol Navigasi Bawah */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => router.push('/documents')}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Files className="h-4 w-4" /> Lihat Semua Dokumen
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            <Home className="h-4 w-4" /> Kembali ke Beranda
          </button>
        </div>

      </div>
    </div>
  )
}