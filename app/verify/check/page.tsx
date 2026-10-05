'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import PageHeaderBanner from '@/components/PageHeaderBanner'

interface VerifyResult {
  isValid: boolean
  documentId?: string
  title?: string
  createdAt?: string
  status?: string
  checksum?: string
  message?: string
}

export default function VerifyCheckPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile)
      setResult(null)
    } else {
      alert('Hanya berkas format PDF yang didukung.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setResult(null)
    } else {
      alert('Hanya berkas format PDF yang didukung.')
    }
  }

  const handleVerify = async () => {
    if (!file) return
    setVerifying(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/verify', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      setResult(data)
    } catch {
      setResult({
        isValid: false,
        message: 'Terjadi kesalahan saat memverifikasi berkas.',
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
  }

  return (
    <div className="mx-auto max-w-5xl w-full space-y-6">
      {/* Header Banner Card */}
        <PageHeaderBanner
          title="Verifikasi Dokumen"
          subtitle="Pemeriksaan keaslian dan integritas berkas PDF bertanda tangan digital."
        />

        {/* Form Upload & Dropzone */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-6">
          {!result && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#003b73] mb-3 shadow-2xs">
                <UploadCloud className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Tarik & lepas berkas PDF di sini, atau{' '}
                <label className="cursor-pointer text-blue-600 hover:underline">
                  pilih berkas
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Hanya mendukung format PDF resmi.</p>

              {file && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 px-3.5 py-2 border border-blue-200/80 text-xs font-semibold text-blue-900">
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[300px]">{file.name}</span>
                  <span className="text-[10px] text-blue-600">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tombol Periksa */}
          {!result && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!file || verifying}
                onClick={handleVerify}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#003b73] hover:bg-[#002d58] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verifikasi Keaslian
                  </>
                )}
              </button>
            </div>
          )}

          {/* Hasil Verifikasi: Valid */}
          {result && result.isValid && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-emerald-900">
                    Dokumen Asli & Terverifikasi
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Checksum SHA-256 berkas cocok dengan tanda tangan terdaftar di sistem.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/80 rounded-xl p-4 border border-emerald-100 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Judul Dokumen:</span>
                  <p className="font-bold text-slate-800">{result.title}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Status:</span>
                  <p className="font-bold text-emerald-700 uppercase">{result.status}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 font-medium">Kode Integritas (SHA-256):</span>
                  <p className="font-mono text-[11px] text-slate-600 break-all bg-slate-50 p-2 rounded-lg border border-slate-100 mt-0.5">
                    {result.checksum}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Periksa Berkas Lain
                </button>
                {result.documentId && (
                  <Link
                    href={`/verify/${result.documentId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Buka Sertifikat Lengkap <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Hasil Verifikasi: Tidak Valid */}
          {result && !result.isValid && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-rose-900">
                    Dokumen Tidak Terverifikasi
                  </h3>
                  <p className="text-xs text-rose-700">
                    {result.message || 'Berkas tidak ditemukan atau telah mengalami perubahan.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-[#003b73] hover:bg-[#002d58] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Coba Periksa Berkas Lain
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}
