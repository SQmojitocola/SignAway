'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, XCircle, Download, CheckCircle2 } from 'lucide-react'

interface Recipient {
  id: string
  userId?: string
  status: string
  rejectReason?: string | null
  user: { id: string; name: string; email: string }
}

interface DocumentField {
  id: string
  recipientId: string
  pageNumber: number
  posX: number
  posY: number
  width: number
  height: number
  recipient?: {
    user?: { name: string }
  }
}

interface DocumentData {
  id: string
  title: string
  filePath: string
  status: string
  rejectReason?: string | null
  createdAt: string
  sender: { id: string; name: string; email: string }
  recipients: Recipient[]
  fields?: DocumentField[]
}

const PDF_VIEWPORT_SCALE = 1.25

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [pdfPages, setPdfPages] = useState<
    Array<{ pageNumber: number; width: number; height: number; originalWidth: number; originalHeight: number }>
  >([])

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})

  useEffect(() => {
    fetch(`/api/documents/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
        const rawDoc = data.document || data
        setDoc(rawDoc)
      })
      .catch((err) => console.error('Fetch error:', err))
      .finally(() => setLoading(false))
  }, [documentId])

  useEffect(() => {
    if (!doc?.filePath) return

    let cancelled = false

    const renderPdf = async () => {
      try {
        const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

        const pdf = await pdfjs.getDocument(doc.filePath).promise
        const pages: Array<{ pageNumber: number; width: number; height: number; originalWidth: number; originalHeight: number }> = []

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const unscaledViewport = page.getViewport({ scale: 1.0 })
          const viewport = page.getViewport({ scale: PDF_VIEWPORT_SCALE })

          pages.push({
            pageNumber: i,
            width: viewport.width,
            height: viewport.height,
            originalWidth: unscaledViewport.width,
            originalHeight: unscaledViewport.height,
          })
        }

        if (!cancelled) setPdfPages(pages)

        setTimeout(async () => {
          for (const pageInfo of pages) {
            if (cancelled) break
            const page = await pdf.getPage(pageInfo.pageNumber)
            const pageElement = pageRefs.current[pageInfo.pageNumber]
            const canvas = pageElement?.querySelector('canvas')
            const context = canvas?.getContext('2d')
            if (!canvas || !context) continue

            const viewport = page.getViewport({ scale: PDF_VIEWPORT_SCALE })
            canvas.width = viewport.width
            canvas.height = viewport.height

            context.clearRect(0, 0, canvas.width, canvas.height)
            await page.render({ canvasContext: context, viewport }).promise
          }
        }, 100)
      } catch (err) {
        console.error('Error rendering PDF:', err)
      }
    }

    renderPdf()
    return () => {
      cancelled = true
    }
  }, [doc?.filePath])

  // Handler Unduh File via API Stream
  const handleDownload = async () => {
    if (!doc) return
    setDownloading(true)
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`)
      if (!response.ok) throw new Error('Gagal mengunduh dokumen')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.title.endsWith('.pdf') ? doc.title : `${doc.title}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      alert('Gagal mengunduh berkas PDF.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat detail dokumen...</div>
  if (!doc) return <div className="p-8 text-center text-slate-500">Dokumen tidak ditemukan.</div>

  const rejectingRecipient = doc.recipients?.find((r) => r.status === 'REJECTED')
  const rejectReasonText = rejectingRecipient?.rejectReason || doc.rejectReason || 'Alasan penolakan tidak dicantumkan.'
  const rejecterName = rejectingRecipient?.user?.name || 'Penandatangan'

  const isRejected = doc.status === 'REJECTED' || !!rejectingRecipient
  const isCompleted = doc.status === 'COMPLETED'

  return (
    <div className="flex h-screen w-full flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{doc.title}</h1>
            <p className="text-[10px] text-slate-400">Pengirim: {doc.sender?.name || '-'}</p>
          </div>
        </div>

        {/* Status Badge Pojok Kanan Atas */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">STATUS:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              isRejected
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : isCompleted
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {isRejected ? 'DITOLAK' : doc.status}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <main className="flex-1 overflow-auto bg-slate-900/80 p-8 flex justify-center items-start">
          <div className="flex flex-col items-center gap-8 pb-16">
            {pdfPages.map((page) => (
              <div
                key={page.pageNumber}
                ref={(el) => {
                  pageRefs.current[page.pageNumber] = el
                }}
                className="relative bg-white shadow-2xl rounded-sm select-none"
                style={{ width: page.width, height: page.height }}
              >
                <canvas className="block" width={page.width} height={page.height} />

                {/* 📍 OVERLAY KALIBRASI KOORDINAT FIELD TTD PRESISI */}
                {doc.fields
                  ?.filter((f) => f.pageNumber === page.pageNumber)
                  .map((field) => {
                    const scaleFactor = page.width / page.originalWidth
                    const scaledLeft = field.posX * scaleFactor
                    const scaledTop = field.posY * scaleFactor
                    const scaledWidth = field.width * scaleFactor
                    const scaledHeight = field.height * scaleFactor

                    return (
                      <div
                        key={field.id}
                        className="absolute flex items-center justify-center rounded border-2 border-dashed border-blue-500 bg-blue-500/20 shadow-md backdrop-blur-[1px]"
                        style={{
                          left: `${scaledLeft}px`,
                          top: `${scaledTop}px`,
                          width: `${scaledWidth}px`,
                          height: `${scaledHeight}px`,
                        }}
                      >
                        <span className="text-[10px] font-bold text-blue-900 bg-white/80 px-1.5 py-0.5 rounded shadow-sm">
                          {field.recipient?.user?.name || 'Tanda Tangan'}
                        </span>
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </main>

        {/* Sidebar Kanan Info */}
        <aside className="w-80 border-l border-slate-800 bg-slate-950 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* Card Info Alasan Penolakan */}
          {isRejected && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                <XCircle className="h-4 w-4 shrink-0" /> Dokumen Ditolak
              </div>
              <div className="space-y-1.5 pt-1 text-xs">
                <p className="text-[11px] text-slate-400">
                  Ditolak oleh:{' '}
                  <span className="font-bold text-white">{rejecterName}</span>
                </p>
                <div className="rounded-lg border border-red-900/40 bg-slate-900 p-3 text-[11px] italic text-red-200">
                  "{rejectReasonText}"
                </div>
              </div>
            </div>
          )}

          {/* Status Riwayat Penandatanganan */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Riwayat Penandatanganan
            </h3>
            {doc.recipients?.map((r, idx) => (
              <div
                key={r.id}
                className="flex items-center justify-between border-b border-slate-800/50 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                  <div>
                    <p className="text-xs font-medium text-slate-300">{r.user?.name}</p>
                    <p className="text-[9px] text-slate-500">{r.user?.email}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    r.status === 'SIGNED'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : r.status === 'REJECTED'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>

          {/* FRAME KARTU UNDUH DOKUMEN */}
          {isCompleted && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Dokumen Selesai
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Semua pihak telah menandatangani dokumen ini. Anda dapat mengunduh salinan resmi berkas PDF.
              </p>
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Mengunduh...' : 'Unduh Dokumen (PDF)'}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}