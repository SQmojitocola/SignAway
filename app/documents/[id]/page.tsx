'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, XCircle } from 'lucide-react'

interface Recipient {
  id: string
  userId?: string
  status: string
  rejectReason?: string | null
  user: { id: string; name: string; email: string }
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
}

const PDF_VIEWPORT_SCALE = 1.25

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfPages, setPdfPages] = useState<Array<{ pageNumber: number; width: number; height: number }>>([])

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
        const pages: Array<{ pageNumber: number; width: number; height: number }> = []

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: PDF_VIEWPORT_SCALE })
          pages.push({ pageNumber: i, width: viewport.width, height: viewport.height })
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

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat detail dokumen...</div>
  if (!doc) return <div className="p-8 text-center text-slate-500">Dokumen tidak ditemukan.</div>

  // Deteksi penerima yang menolak & alasan penolakannya
  const rejectingRecipient = doc.recipients?.find((r) => r.status === 'REJECTED')
  const rejectReasonText = rejectingRecipient?.rejectReason || doc.rejectReason || 'Alasan penolakan tidak dicantumkan.'
  const rejecterName = rejectingRecipient?.user?.name || 'Penandatangan'

  const isRejected = doc.status === 'REJECTED' || !!rejectingRecipient

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
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            isRejected
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : doc.status === 'COMPLETED'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
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
                ref={(el) => { pageRefs.current[page.pageNumber] = el }}
                className="relative bg-white shadow-2xl rounded-sm select-none"
                style={{ width: page.width, height: page.height }}
              >
                <canvas className="block" width={page.width} height={page.height} />
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
                  <span className="font-bold text-white">
                    {rejecterName}
                  </span>
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
              <div key={r.id} className="flex items-center justify-between border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                  <div>
                    <p className="text-xs font-medium text-slate-300">{r.user?.name}</p>
                    <p className="text-[9px] text-slate-500">{r.user?.email}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  r.status === 'SIGNED' ? 'bg-emerald-500/10 text-emerald-400' :
                  r.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}