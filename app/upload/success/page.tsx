'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CheckCircle, Home, Files } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
}

interface DocumentRecipient {
  id: string
  status: 'PENDING' | 'WAITING' | 'SIGNED' | 'REJECTED'
  user: { name: string; email: string }
}

interface DocumentField {
  recipientId: string
  pageNumber: number
}

interface SuccessDocument {
  title: string
  sequential: boolean
  createdAt: string
  recipients: DocumentRecipient[]
}

const statusLabels: Record<DocumentRecipient['status'], string> = {
  PENDING: 'Menunggu Giliran',
  WAITING: 'Menunggu Tanda Tangan',
  SIGNED: 'Sudah Menandatangani',
  REJECTED: 'Ditolak',
}

export default function SendSuccessPage() {
  const router = useRouter()
  const [document, setDocument] = useState<SuccessDocument | null>(null)
  const [fields, setFields] = useState<DocumentField[]>([])
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    fetch('/api/users?me=true')
      .then((response) => response.json())
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
      .catch((error) => console.error('Gagal memuat profil pengguna:', error))

    const documentId = new URLSearchParams(window.location.search).get('documentId')
    if (!documentId) return

    Promise.all([
      fetch(`/api/documents/${documentId}`).then((response) => response.json()),
      fetch(`/api/documents/fields?documentId=${documentId}`).then((response) => response.json()),
    ]).then(([documentData, fieldData]) => {
      if (documentData.document) setDocument(documentData.document)
      if (fieldData.fields) setFields(fieldData.fields)
    }).catch((error) => console.error('Gagal memuat ringkasan dokumen:', error))
  }, [])

  const getRecipientLocation = (recipientId: string) => {
    const recipientFields = fields.filter((field) => field.recipientId === recipientId)
    if (recipientFields.length === 0) return 'Lokasi belum ditentukan'
    return recipientFields.map((field) => `Halaman ${field.pageNumber}`).join(', ')
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {/* Top Header Ringkas */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-8">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Unggah Dokumen</span>
          <span>&gt;</span>
          <span className="font-semibold text-slate-800">Konfirmasi Pengiriman</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">{user?.name ?? 'Memuat...'}</p>
            <p className="text-[10px] text-slate-400">{user?.email ?? 'Memuat profil'}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e4273] text-xs font-bold text-white">
            {(user?.name ?? 'U').split(' ').filter(Boolean).slice(0,2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U'}
          </div>
        </div>
      </header>

      {/* Main Container Card */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center space-y-6">
          {/* Success Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">Dokumen Berhasil Dikirim!</h1>
            <p className="text-xs text-slate-500 mt-1">
              Dokumen Anda telah berhasil dikirim kepada semua pihak terkait untuk proses penandatanganan secara digital.
            </p>
          </div>

          {/* Info Card Dokumen */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 font-bold text-xs">
                  PDF
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{document?.title || 'Dokumen PDF'}</p>
                  <p className="text-[10px] text-slate-400">Dokumen berhasil diproses</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                • Menunggu Tanda Tangan
              </span>
            </div>

            <div className="grid grid-cols-2 pt-2 border-t border-slate-200/60 text-[11px]">
              <div>
                <p className="text-slate-400">Waktu Pengiriman:</p>
                <p className="font-semibold text-slate-700">{document ? new Date(document.createdAt).toLocaleString('id-ID') : '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Metode Tanda Tangan:</p>
                <p className="font-semibold text-slate-700">{document?.sequential ? 'Berurutan' : 'Bersamaan'}</p>
              </div>
            </div>
          </div>

          {/* Daftar Penerima */}
          <div className="space-y-2 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Daftar Penandatangan ({document?.recipients.length || 0} Pihak)
            </p>

            {document?.recipients.map((recipient, index) => (
              <div key={recipient.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{recipient.user.name}</p>
                    <p className="text-[10px] text-slate-500">{recipient.user.email} • <span className="text-blue-600 font-medium">{getRecipientLocation(recipient.id)}</span></p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-lg">{statusLabels[recipient.status]}</span>
              </div>
            ))}
          </div>

          {/* Tombol Aksi */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push('/documents')}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Files className="h-4 w-4" /> Lihat Semua Dokumen
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1e4273] py-2.5 text-xs font-semibold text-white hover:bg-blue-900"
            >
              <Home className="h-4 w-4" /> Kembali ke Beranda
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}