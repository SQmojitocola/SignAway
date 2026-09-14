'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, PenTool, CheckCircle2 } from 'lucide-react'

interface Field {
  id: string
  recipientId: string
  recipientName: string
  type: string
  pageNumber: number
  posX: number
  posY: number
  width: number
  height: number
  value?: string | null
}

interface Recipient {
  id: string
  userId?: string
  status: string
  signingOrder?: number | null
  user: { id: string; name: string; email: string }
}

interface DocumentData {
  id: string
  title: string
  filePath: string
  sequential?: boolean
  sender: { id: string; name: string; email: string }
  fields: Field[]
  recipients: Recipient[]
}

const PDF_VIEWPORT_SCALE = 1.25

export default function SignDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [pdfPages, setPdfPages] = useState<Array<{ pageNumber: number; width: number; height: number }>>([])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [isDrawing, setIsDrawing] = useState(false)

  // 1. Fetch data dokumen & user
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docRes, userRes] = await Promise.all([
          fetch(`/api/documents/${documentId}`),
          fetch('/api/users?me=true'),
        ])

        if (docRes.ok && userRes.ok) {
          const docData = await docRes.json()
          const userData = await userRes.json()
          
          // FIX BUG #1: Ambil data dari userData.user (bukan userData)
          const activeUser = userData.user || userData
          const activeUserId = activeUser.id
          const activeUserEmail = activeUser.email

          setCurrentUserId(activeUserId)
          setCurrentUserEmail(activeUserEmail)

          const rawDoc = docData.document || docData
          const recipients = rawDoc.recipients || []

          const normalizedFields = (rawDoc.fields || []).map((f: any) => {
            let matchedRecipient = recipients.find((r: any) => r.id === f.recipientId)
            
            // Handle jika recipientId tersimpan sebagai 'self' atau matching via userId
            if (!matchedRecipient) {
              matchedRecipient = recipients.find((r: any) => r.user?.id === activeUserId || r.userId === activeUserId)
            }

            return {
              id: f.id,
              recipientId: matchedRecipient?.id || f.recipientId,
              recipientName: matchedRecipient?.user?.name || f.recipient?.user?.name || 'Penandatangan',
              type: 'SIGNATURE',
              pageNumber: f.pageNumber || f.page || 1,
              posX: f.posX,
              posY: f.posY,
              width: f.width || 150,
              height: f.height || 70,
            }
          })

          setDoc({
            ...rawDoc,
            fields: normalizedFields
          })
        }
      } catch (err) {
        console.error('Failed fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [documentId])

  // 2. Render PDF (Persis sama dengan Edit Page)
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
            
            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise
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

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y
    if ('touches' in e) {
      e.preventDefault()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
    }

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'))
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignatureData(null)
    }
  }

  // Submit Penandatanganan
  const handleSign = async () => {
    if (!signatureData) {
      alert('Silakan buat tanda tangan terlebih dahulu pada papan TTD.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/documents/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          signatureImageBase64: signatureData,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        alert('Dokumen berhasil ditandatangani!')
        router.push('/dashboard')
      } else {
        alert(result.message || 'Gagal memproses penandatanganan')
      }
    } catch (error) {
      console.error('Sign error:', error)
      alert('Terjadi kesalahan jaringan/server.')
    } finally {
      setSubmitting(false)
    }
  }

  const recipientsList = doc?.recipients || []
  const fieldsList = doc?.fields || []
  
  // Deteksi penerima milik user aktif secara pasti
  const myRecipientInDoc = useMemo(() => {
    if (!currentUserId) return null
    return recipientsList.find(
      (r) =>
        r.user?.id === currentUserId ||
        r.userId === currentUserId ||
        (currentUserEmail && r.user?.email === currentUserEmail)
    )
  }, [recipientsList, currentUserId, currentUserEmail])

  // Hak Akses Penandatanganan: Wajib Berurutan Sesuai Daftar Recipient
  const isMyTurn = useMemo(() => {
    if (!currentUserId || !myRecipientInDoc) return false

    if (myRecipientInDoc.status === 'SIGNED' || myRecipientInDoc.status === 'REJECTED') {
      return false
    }

    // Urutkan penerima berdasarkan signingOrder (atau indeks urutan dalam list)
    const sortedRecipients = [...recipientsList].sort((a, b) => {
      const orderA = a.signingOrder ?? recipientsList.indexOf(a)
      const orderB = b.signingOrder ?? recipientsList.indexOf(b)
      return orderA - orderB
    })

    // Cari penandatangan pertama yang BELUM menandatangani
    const currentActiveSigner = sortedRecipients.find(
      (r) => r.status !== 'SIGNED' && r.status !== 'REJECTED'
    )

    if (!currentActiveSigner) return false

    // Cocokkan apakah user yang login adalah penandatangan aktif urutan pertama
    return (
      currentActiveSigner.id === myRecipientInDoc.id ||
      currentActiveSigner.user?.id === currentUserId ||
      currentActiveSigner.userId === currentUserId ||
      (currentUserEmail && currentActiveSigner.user?.email === currentUserEmail)
    )
  }, [currentUserId, currentUserEmail, myRecipientInDoc, recipientsList])

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat dokumen...</div>
  if (!doc) return <div className="p-8 text-center text-slate-500">Dokumen tidak ditemukan.</div>

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

        <button
          type="button"
          onClick={handleSign}
          disabled={submitting || !signatureData || !isMyTurn}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Memproses...' : 'Kirim Tanda Tangan'}
        </button>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Area PDF Viewer Utama */}
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
                
                {/* Overlay Fields (1:1 Sama Persis dengan Halaman Edit) */}
                {fieldsList
                  .filter(f => f.pageNumber === page.pageNumber)
                  .map(field => {
                    const recipient = recipientsList.find(r => r.id === field.recipientId)
                    const isMine =
                      field.recipientId === myRecipientInDoc?.id ||
                      (recipient?.user?.id || recipient?.userId) === currentUserId ||
                      (currentUserEmail && recipient?.user?.email === currentUserEmail)
                    const isSigned = recipient?.status === 'SIGNED'

                    return (
                      <div
                        key={field.id}
                        style={{
                          position: 'absolute',
                          left: `${field.posX}px`,
                          top: `${field.posY}px`,
                          width: `${field.width}px`,
                          height: `${field.height}px`,
                        }}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-1 z-10 box-border ${
                          isMine 
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' 
                            : 'border-blue-500 bg-blue-500/10 text-blue-500'
                        }`}
                      >
                        {isMine && signatureData ? (
                          <img src={signatureData} alt="Preview TTD" className="h-full w-full object-contain pointer-events-none" />
                        ) : isSigned ? (
                           <div className="flex flex-col items-center opacity-40">
                             <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                             <span className="text-[8px] font-bold text-emerald-800 uppercase">{field.recipientName}</span>
                           </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center overflow-hidden p-0.5 w-full h-full">
                            <PenTool className="h-4 w-4 shrink-0 mb-0.5" />
                            <p className="text-[10px] font-bold uppercase truncate w-full">
                              {field.recipientName}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </main>

        {/* Sidebar Kanan untuk Papan TTD */}
        <aside className="w-80 border-l border-slate-800 bg-slate-950 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Papan Tanda Tangan</h2>

          {isMyTurn ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400 mb-2 italic">Goreskan tanda tangan Anda di kotak putih:</p>
              <canvas
                ref={canvasRef}
                width={260}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full rounded-lg bg-white border border-slate-700 cursor-crosshair touch-none"
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Bersihkan Papan
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-4">
              <p className="text-xs text-amber-200/70">
                {!myRecipientInDoc
                  ? 'Anda tidak terdaftar sebagai penandatangan pada dokumen ini.'
                  : myRecipientInDoc.status === 'SIGNED'
                  ? 'Anda telah selesai menandatangani dokumen ini.'
                  : 'Belum giliran Anda untuk menandatangani dokumen ini.'}
             </p>
            </div>
          )}

          <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status Alur Dokumen</h3>
            {recipientsList.map((r, idx) => {
              const isCurrentUser =
                r.id === myRecipientInDoc?.id ||
                (r.user?.id || r.userId) === currentUserId ||
                (currentUserEmail && r.user?.email === currentUserEmail)

              return (
                <div key={r.id} className="flex items-center justify-between border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">#{idx+1}</span>
                    <span className={`text-xs ${isCurrentUser ? 'font-bold text-white' : 'text-slate-300'}`}>
                      {r.user?.name || 'User'}
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    r.status === 'SIGNED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {r.status}
                  </span>
                </div>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}