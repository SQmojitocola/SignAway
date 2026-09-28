'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, XCircle, Download, CheckCircle2, ShieldAlert, ShieldCheck, Clock, PenTool } from 'lucide-react'
import ProxyRequestModal from '@/components/document/ProxyRequestModal'

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
    Array<{ pageNumber: number; width: number; height: number }>
  >([])

  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [proxyInfo, setProxyInfo] = useState<{
    approvedProxy: { id: string; targetUser: { id: string; name: string } } | null
    latestRequest: { id: string; status: string; rejectionNote?: string | null; targetUser: { id: string; name: string } } | null
  } | null>(null)
  const [showProxyModal, setShowProxyModal] = useState(false)
  const [defaultTargetUserId, setDefaultTargetUserId] = useState<string | undefined>(undefined)

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const fetchDocAndProxy = async () => {
    try {
      const [docRes, userRes, proxyRes] = await Promise.all([
        fetch(`/api/documents/${documentId}`),
        fetch('/api/users?me=true'),
        fetch(`/api/proxy-requests/check?documentId=${documentId}`),
      ])

      if (docRes.ok) {
        const data = await docRes.json()
        setDoc(data.document || data)
      }
      if (userRes.ok) {
        const uData = await userRes.json()
        setCurrentUser(uData.user || uData)
      }
      if (proxyRes.ok) {
        const pData = await proxyRes.json()
        setProxyInfo(pData)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocAndProxy()
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

          pages.push({
            pageNumber: i,
            width: viewport.width,
            height: viewport.height,
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

        <div className="flex items-center gap-3">
          {!isCompleted && !isRejected && (
            proxyInfo?.approvedProxy ? (
              <button
                type="button"
                onClick={() => router.push(`/documents/${documentId}/sign`)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-colors cursor-pointer"
              >
                <PenTool className="h-3.5 w-3.5" /> Tanda Tangani (Kuasa)
              </button>
            ) : doc.recipients?.some((r) => r.user?.id === currentUser?.id && (r.status === 'WAITING' || r.status === 'PENDING')) ? (
              <button
                type="button"
                onClick={() => router.push(`/documents/${documentId}/sign`)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md transition-colors cursor-pointer"
              >
                <PenTool className="h-3.5 w-3.5" /> Tanda Tangani Dokumen
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDefaultTargetUserId(undefined)
                  setShowProxyModal(true)
                }}
                className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-950/30 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-900/40 transition-colors cursor-pointer"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> Ajukan Proxy TTD
              </button>
            )
          )}

          <div className="flex items-center gap-1.5">
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
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
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

                {/* 📍 RENDER OVERLAY FIELD SAMA PERSIS DENGAN CANVAS EDITOR */}
                {doc.fields
                  ?.filter((f) => f.pageNumber === page.pageNumber)
                  .map((field) => (
                    <div
                      key={field.id}
                      className="absolute flex items-center justify-center rounded border-2 border-dashed border-blue-500 bg-blue-500/20 shadow-md backdrop-blur-[1px]"
                      style={{
                        left: `${field.posX}px`,
                        top: `${field.posY}px`,
                        width: `${field.width}px`,
                        height: `${field.height}px`,
                      }}
                    >
                      <span className="text-[10px] font-bold text-blue-900 bg-white/80 px-1.5 py-0.5 rounded shadow-sm">
                        {field.recipient?.user?.name || 'Tanda Tangan'}
                      </span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </main>

        <aside className="w-80 border-l border-slate-800 bg-slate-950 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* Banner Status Izin Proxy */}
          {proxyInfo?.approvedProxy ? (
            <div className="rounded-xl border border-blue-500/40 bg-blue-950/40 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-400" /> Izin Perwakilan Aktif
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Anda disetujui mewakili <strong>{proxyInfo.approvedProxy.targetUser.name}</strong> untuk menandatangani dokumen ini.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/documents/${documentId}/sign`)}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
              >
                <PenTool className="h-3.5 w-3.5" /> Tanda Tangani Sekarang
              </button>
            </div>
          ) : proxyInfo?.latestRequest?.status === 'PENDING' ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Clock className="h-4 w-4 shrink-0" /> Pengajuan Proxy Menunggu
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Permohonan mewakili <strong>{proxyInfo.latestRequest.targetUser.name}</strong> sedang menunggu persetujuan Administrator.
              </p>
            </div>
          ) : proxyInfo?.latestRequest?.status === 'REJECTED' ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <XCircle className="h-4 w-4 shrink-0" /> Pengajuan Proxy Ditolak
              </div>
              <p className="text-[11px] text-slate-300">
                {proxyInfo.latestRequest.rejectionNote || 'Ditolak oleh Administrator.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setDefaultTargetUserId(undefined)
                  setShowProxyModal(true)
                }}
                className="text-[10px] text-rose-300 hover:underline font-bold pt-1 cursor-pointer"
              >
                Ajukan Ulang Permohonan
              </button>
            </div>
          ) : null}

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
                  &quot;{rejectReasonText}&quot;
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Riwayat Penandatanganan
              </h3>
              {!isCompleted && !isRejected && !proxyInfo?.approvedProxy && (
                <button
                  type="button"
                  onClick={() => {
                    setDefaultTargetUserId(undefined)
                    setShowProxyModal(true)
                  }}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-0.5 cursor-pointer"
                >
                  <ShieldAlert className="h-3 w-3 text-amber-400" /> Ajukan Proxy
                </button>
              )}
            </div>

            {doc.recipients?.map((r, idx) => {
              const isTargetOfApprovedProxy = proxyInfo?.approvedProxy?.targetUser.id === r.user?.id
              const canRequestProxyForThis =
                !isCompleted &&
                !isRejected &&
                (r.status === 'WAITING' || r.status === 'PENDING') &&
                currentUser &&
                r.user?.id !== currentUser.id &&
                !isTargetOfApprovedProxy

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b border-slate-800/50 pb-2.5 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">#{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">{r.user?.name}</p>
                      <p className="text-[9px] text-slate-500 truncate">{r.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isTargetOfApprovedProxy && (
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-500/30">
                        Diwakili Anda
                      </span>
                    )}

                    {canRequestProxyForThis && (
                      <button
                        type="button"
                        onClick={() => {
                          setDefaultTargetUserId(r.user?.id)
                          setShowProxyModal(true)
                        }}
                        title={`Ajukan izin untuk mewakili tanda tangan ${r.user?.name}`}
                        className="flex items-center gap-1 rounded bg-slate-800/90 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 hover:bg-slate-700 hover:text-blue-300 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <ShieldAlert className="h-2.5 w-2.5 text-amber-400" /> Mewakili
                      </button>
                    )}

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
                </div>
              )
            })}
          </div>

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
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Mengunduh...' : 'Unduh Dokumen (PDF)'}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Modal Pengajuan Proxy */}
      {doc && (
        <ProxyRequestModal
          isOpen={showProxyModal}
          onClose={() => setShowProxyModal(false)}
          documentId={doc.id}
          documentTitle={doc.title}
          defaultTargetUserId={defaultTargetUserId}
          recipients={doc.recipients}
          onSuccess={fetchDocAndProxy}
        />
      )}
    </div>
  )
}