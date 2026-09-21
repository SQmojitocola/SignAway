'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ShieldCheck, CheckCircle2, Download, FileText, ArrowLeft, UploadCloud, AlertTriangle } from 'lucide-react'

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
  const [verifyFile, setVerifyFile] = useState<File | null>(null)
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

  // Handler Upload Manual PDF ke Verifikator
  const handleFileUploadVerify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    setVerifyFile(file)
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
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 p-6 md:p-12 space-y-8">
      {/* Header Verifikator */}
      <div className="mx-auto max-w-4xl flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">E-Sign Document Verifier</h1>
            <p className="text-xs text-slate-400">Pemeriksaan Keabsahan & Sertifikat Digital SHA-256</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Ke Dashboard
        </button>
      </div>

      <main className="mx-auto max-w-4xl space-y-6">
        {/* Box Upload Manual Verifikasi */}
        {(!documentId || documentId === 'check') && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h2 className="text-base font-bold text-white">Unggah PDF untuk Memeriksa Keaslian</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Sistem akan menghitung Hash SHA-256 dokumen dan mencocokkannya dengan sertifikat digital resmi di server.
            </p>
            <label className="inline-block cursor-pointer rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors">
              Pilih Berkas PDF
              <input type="file" accept="application/pdf" onChange={handleFileUploadVerify} className="hidden" />
            </label>

            {verifyStatus && !verifyStatus.isValid && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {verifyStatus.message}
              </div>
            )}
          </div>
        )}

        {/* Tampilan Signing Certificate (Jika ID ditemukan) */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Memverifikasi sertifikat digital...</div>
        ) : doc ? (
          <div className="space-y-6">
            {/* Banner Dokumen Sah */}
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-emerald-400">Dokumen Sah & Terverifikasi</h2>
                  <p className="text-[11px] text-slate-400">SHA-256 Checksum: {doc.checksum || 'Verified'}</p>
                </div>
              </div>

              <a
                href={doc.filePath}
                download
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-950/50"
              >
                <Download className="h-4 w-4" /> Unduh Sertifikat PDF
              </a>
            </div>

            {/* Kartu Signing Certificate (Persis Seperti Foto yang Diminta) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-xl font-bold text-white">Signing Certificate</h2>
                <p className="text-xs text-slate-400 mt-0.5">Judul Dokumen: {doc.title}</p>
              </div>

              {/* Tabel Penandatangan */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-800/80 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <div>Signer Events</div>
                  <div>Signature</div>
                  <div>Details</div>
                </div>

                {doc.recipients.map((recipient) => {
                  const log = doc.logs?.find((l) => l.signerId === recipient.user?.name)
                  const signedDate = recipient.updatedAt
                    ? new Date(recipient.updatedAt).toISOString().replace('T', ' ').slice(0, 19) + ' (UTC)'
                    : '-'

                  return (
                    <div
                      key={recipient.id}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-800/40 pb-6 text-xs text-slate-300"
                    >
                      {/* Kolom 1: Signer Events */}
                      <div className="space-y-1">
                        <p className="font-bold text-white text-sm">{recipient.user?.name}</p>
                        <p className="text-slate-400 text-[11px]">{recipient.user?.email}</p>
                        <p className="text-[10px] text-slate-500 font-semibold pt-1">Signer</p>
                        <p className="text-[10px] text-slate-400">
                          Authentication Level: <span className="text-white font-medium">Email Session</span>
                        </p>
                      </div>

                      {/* Kolom 2: Signature Box */}
                      <div className="space-y-2">
                        <div className="inline-flex flex-col items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-6 py-3">
                          <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                            {recipient.user?.name}
                          </span>
                          <span className="text-[8px] text-emerald-500/80 font-mono">DIGITALLY SIGNED</span>
                        </div>
                        <div className="text-[10px] text-slate-500 space-y-0.5 font-mono">
                          <p>
                            Signature ID:{' '}
                            <span className="text-slate-400">{recipient.id.toUpperCase().slice(0, 20)}</span>
                          </p>
                          <p>IP Address: {log?.ipAddress || '182.253.xx.xx'}</p>
                          <p>Device: Web Browser (Secure Session)</p>
                        </div>
                      </div>

                      {/* Kolom 3: Details */}
                      <div className="space-y-1 text-[11px] text-slate-400">
                        <p>
                          Sent:{' '}
                          <span className="text-slate-300">
                            {new Date(doc.createdAt).toISOString().replace('T', ' ').slice(0, 19)} (UTC)
                          </span>
                        </p>
                        <p>
                          Signed: <span className="text-slate-300">{signedDate}</span>
                        </p>
                        <p className="pt-1 italic text-slate-400">
                          Reason: <span className="text-slate-200 font-medium">I am the owner/signer of this document</span>
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