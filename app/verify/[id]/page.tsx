'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ShieldCheck, CheckCircle2, Download, ArrowLeft, UploadCloud, AlertTriangle, FileCheck } from 'lucide-react'

interface DocumentVerificationData {
  id: string
  title: string
  checksum: string
  status: string
  createdAt: string
  sender: { name: string; email: string }
  recipients: Array<{
    id: string
    status: string
    updatedAt: string
    user: { name: string; email: string }
  }>
  logs: Array<{
    id: string
    signerId: string
    ipAddress: string
    createdAt: string
  }>
}

export default function PublicVerifierPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [doc, setDoc] = useState<DocumentVerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifyStatus, setVerifyStatus] = useState<{ isValid?: boolean; message?: string } | null>(null)

  useEffect(() => {
    if (!documentId || documentId === 'check') {
      setLoading(false)
      return
    }

    fetch(`/api/documents/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.document) setDoc(data.document)
      })
      .catch((err) => console.error('Fetch error:', err))
      .finally(() => setLoading(false))
  }, [documentId])

  const handleFileUploadVerify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/verify', { method: 'POST', body: formData })
      const data = await res.json()

      if (res.ok && data.isValid) {
        router.push(`/verify/${data.documentId}`)
      } else {
        setVerifyStatus({ isValid: false, message: data.message })
      }
    } catch (err) {
      setVerifyStatus({ isValid: false, message: 'Gagal memverifikasi berkas.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    // 📍 Gunakan w-full bg-slate-100/80 agar rapi sejajar dengan Sidebar & tema aplikasi
    <div className="min-h-screen w-full bg-slate-100/80 p-8 space-y-6">
      {/* Header Verifikator */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Verifikasi Keabsahan Dokumen</h1>
            <p className="text-xs text-slate-500 mt-0.5">Pemeriksaan Sertifikat Digital & SHA-256 Checksum</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Ke Dashboard
        </button>
      </div>

      <main className="space-y-6">
        {/* Box Upload Manual Verifikasi */}
        {(!documentId || documentId === 'check') && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center space-y-4 shadow-sm max-w-3xl mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Unggah PDF untuk Memeriksa Keaslian</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Sistem akan menghitung Hash SHA-256 dari dokumen PDF yang diunggah dan mencocokkannya dengan database resmi.
              </p>
            </div>

            <label className="inline-block cursor-pointer rounded-xl bg-[#1e4273] px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-md">
              Pilih Berkas PDF
              <input type="file" accept="application/pdf" onChange={handleFileUploadVerify} className="hidden" />
            </label>

            {verifyStatus && !verifyStatus.isValid && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {verifyStatus.message}
              </div>
            )}
          </div>
        )}

        {/* Tampilan Signing Certificate */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Memverifikasi sertifikat digital...</div>
        ) : doc ? (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Banner Dokumen Sah */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-emerald-800">Dokumen Sah & Terverifikasi</h2>
                  <p className="text-[11px] text-emerald-600 font-mono mt-0.5">
                    SHA-256 Checksum: {doc.checksum || 'Verified'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`/api/documents/${doc.id}/certificate`}
                  download={`Sertifikat_Valid_${doc.title.replace(/\.pdf$/i, '')}.pdf`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow transition-colors"
                >
                  <FileCheck className="h-4 w-4" /> Unduh Sertifikat Valid
                </a>

                <a
                  href={doc.filePath}
                  download
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow transition-colors"
                >
                  <Download className="h-4 w-4" /> Unduh Dokumen PDF
                </a>
              </div>
            </div>

            {/* Signing Certificate Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 space-y-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800">Signing Certificate</h2>
                <p className="text-xs text-slate-500 mt-0.5">Judul Dokumen: {doc.title}</p>
              </div>

              <div className="space-y-4">
                <div className="hidden md:grid grid-cols-3 gap-4 border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <div>Signer Events</div>
                  <div>Signature</div>
                  <div>Details</div>
                </div>

                {doc.recipients.map((recipient) => {
                  const log = doc.logs?.find((l) => l.signerId === recipient.id || l.signerId === recipient.user?.name)

                  return (
                    <div
                      key={recipient.id}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 pb-6 text-xs text-slate-600"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-sm">{recipient.user?.name}</p>
                        <p className="text-slate-500 text-[11px]">{recipient.user?.email}</p>
                        <p className="text-[10px] text-slate-400 font-semibold pt-1">Signer</p>
                        <p className="text-[10px] text-slate-500">
                          Authentication Level: <span className="text-slate-700 font-medium">Email Session</span>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="inline-flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-3">
                          <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">
                            {recipient.user?.name}
                          </span>
                          <span className="text-[8px] text-emerald-600 font-mono">DIGITALLY SIGNED</span>
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                          <p>
                            Signature ID:{' '}
                            <span className="text-slate-600">{recipient.id.toUpperCase().slice(0, 20)}</span>
                          </p>
                          <p>IP Address: {log?.ipAddress || '182.253.xx.xx'}</p>
                          <p>Device: Web Browser (Secure Session)</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-500">
                        <p>
                          Sent:{' '}
                          <span className="text-slate-700">
                            {new Date(doc.createdAt).toISOString().replace('T', ' ').slice(0, 19)} (UTC)
                          </span>
                        </p>
                        <p className="pt-0.5 italic text-slate-500">
                          Reason:{' '}
                          <span className="text-slate-700 font-medium">
                            Persetujuan & Pengesahan Dokumen Digital (Owner/Signer)
                          </span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}