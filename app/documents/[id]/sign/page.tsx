'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, PenTool, CheckCircle2, XCircle, Check, Image as ImageIcon, Move, ZoomIn, RotateCcw } from 'lucide-react'

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
  const [userSpecimen, setUserSpecimen] = useState<string | null>(null)
  
  // State TTD & Mode Pilihan
  const [sigMode, setSigMode] = useState<'DRAW' | 'SPECIMEN'>('DRAW')
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [bgCropUrl, setBgCropUrl] = useState<string | null>(null)

  // State Manipulasi Spesimen (Ukuran & Posisi)
  const [specimenScale, setSpecimenScale] = useState<number>(100) // 40% - 200%
  const [specimenPos, setSpecimenPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const isDraggingSpecimenRef = useRef(false)
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  })

  // State Modal Penolakan
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [pdfPages, setPdfPages] = useState<Array<{ pageNumber: number; width: number; height: number }>>([])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [isDrawing, setIsDrawing] = useState(false)

  const recipientsList = useMemo(() => doc?.recipients || [], [doc?.recipients])
  const fieldsList = useMemo(() => doc?.fields || [], [doc?.fields])
  
  const myRecipientInDoc = useMemo(() => {
    if (!currentUserId) return null
    return recipientsList.find(
      (r) =>
        r.user?.id === currentUserId ||
        r.userId === currentUserId ||
        (currentUserEmail && r.user?.email === currentUserEmail)
    )
  }, [recipientsList, currentUserId, currentUserEmail])

  const myField = useMemo(() => {
    return (
      fieldsList.find((field) => {
        const recipient = recipientsList.find((r) => r.id === field.recipientId)
        return (
          field.recipientId === myRecipientInDoc?.id ||
          (recipient?.user?.id || recipient?.userId) === currentUserId ||
          (currentUserEmail && recipient?.user?.email === currentUserEmail)
        )
      }) || null
    )
  }, [fieldsList, recipientsList, myRecipientInDoc, currentUserId, currentUserEmail])

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
          
          const activeUser = userData.user || userData
          setCurrentUserId(activeUser.id)
          setCurrentUserEmail(activeUser.email)
          if (activeUser.signatureSpecimen) {
            setUserSpecimen(activeUser.signatureSpecimen)
          }

          const rawDoc = docData.document || docData
          const recipients = rawDoc.recipients || []

          const normalizedFields = (rawDoc.fields || []).map((f: any) => {
            let matchedRecipient = recipients.find((r: any) => r.id === f.recipientId)
            if (!matchedRecipient) {
              matchedRecipient = recipients.find((r: any) => r.user?.id === activeUser.id || r.userId === activeUser.id)
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

  // 2. Mirroring Background Crop dari Dokumen
  const captureMirrorBackground = useCallback(() => {
    if (!myField) return
    const pageElement = pageRefs.current[myField.pageNumber]
    const pdfCanvas = pageElement?.querySelector('canvas')
    if (!pdfCanvas) return

    try {
      const cropCanvas = document.createElement('canvas')
      const targetWidth = myField.width || 150
      const targetHeight = myField.height || 70
      cropCanvas.width = targetWidth
      cropCanvas.height = targetHeight

      const ctx = cropCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(
          pdfCanvas,
          myField.posX,
          myField.posY,
          targetWidth,
          targetHeight,
          0,
          0,
          targetWidth,
          targetHeight
        )
        setBgCropUrl(cropCanvas.toDataURL('image/png'))
      }
    } catch (err) {
      console.error('Mirror background error:', err)
    }
  }, [myField])

  // 3. Render PDF
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

          if (!cancelled) {
            captureMirrorBackground()
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
  }, [doc?.filePath, captureMirrorBackground])

  // Otomatis refresh crop saat myField atau pdfPages tersedia
  useEffect(() => {
    if (myField && pdfPages.length > 0) {
      const timer = setTimeout(() => {
        captureMirrorBackground()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [myField, pdfPages, captureMirrorBackground])

  // Canvas Drawing Handlers dengan Resolusi & Skalasi Presisi
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000'
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    if ('touches' in e) {
      e.preventDefault()
    }

    const { x, y } = getCoordinates(e)
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

  // Mulai drag spesimen TTD
  const startSpecimenDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    isDraggingSpecimenRef.current = true
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initX: specimenPos.x,
      initY: specimenPos.y,
    }
  }

  // Listener global pointer untuk pergerakan drag spesimen
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingSpecimenRef.current) return
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      const deltaX = clientX - dragStartRef.current.startX
      const deltaY = clientY - dragStartRef.current.startY

      setSpecimenPos({
        x: Math.round(dragStartRef.current.initX + deltaX),
        y: Math.round(dragStartRef.current.initY + deltaY),
      })
    }

    const handlePointerUp = () => {
      if (isDraggingSpecimenRef.current) {
        isDraggingSpecimenRef.current = false
      }
    }

    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)
    window.addEventListener('touchmove', handlePointerMove)
    window.addEventListener('touchend', handlePointerUp)

    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
      window.removeEventListener('touchmove', handlePointerMove)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [])

  // Render Spesimen TTD ke Canvas dengan Skalasi dan Posisi Offset
  const updateSpecimenComposite = useCallback(
    (posX: number, posY: number, scalePercent: number) => {
      if (!userSpecimen) return

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const targetW = myField?.width || 150
        const targetH = myField?.height || 70

        const canvas = document.createElement('canvas')
        canvas.width = targetW * 2
        canvas.height = targetH * 2
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Skala dasar gambar agar pas di dalam canvas
        const baseScale = Math.min(
          (canvas.width * 0.85) / img.width,
          (canvas.height * 0.85) / img.height
        )
        const finalScale = baseScale * (scalePercent / 100)
        const drawW = img.width * finalScale
        const drawH = img.height * finalScale

        // Titik tengah canvas + offset posisi (dikalikan 2 karena canvas 2x retina)
        const centerX = canvas.width / 2 + posX * 2
        const centerY = canvas.height / 2 + posY * 2
        const drawX = centerX - drawW / 2
        const drawY = centerY - drawH / 2

        ctx.drawImage(img, drawX, drawY, drawW, drawH)
        setSignatureData(canvas.toDataURL('image/png'))
      }
      img.src = userSpecimen
    },
    [userSpecimen, myField]
  )

  // Otomatis sinkronisasi composite signatureData saat posisi/skala spesimen berubah
  useEffect(() => {
    if (sigMode === 'SPECIMEN' && userSpecimen) {
      updateSpecimenComposite(specimenPos.x, specimenPos.y, specimenScale)
    }
  }, [sigMode, userSpecimen, specimenPos, specimenScale, updateSpecimenComposite])

  // Pilih Spesimen TTD
  const selectSpecimen = () => {
    if (userSpecimen) {
      setSigMode('SPECIMEN')
      updateSpecimenComposite(specimenPos.x, specimenPos.y, specimenScale)
    }
  }

  // Submit Penandatanganan
  const handleSign = async () => {
    if (!signatureData) {
      alert('Silakan buat atau pilih tanda tangan terlebih dahulu.')
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

  // Submit Penolakan Dokumen
  const handleRejectDocument = async () => {
    if (!rejectReason.trim()) {
      alert('Silakan isi alasan penolakan dokumen.')
      return
    }

    setRejecting(true)
    try {
      const res = await fetch('/api/documents/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          reason: rejectReason,
        }),
      })

      const responseText = await res.text()
      const result = responseText ? JSON.parse(responseText) : {}

      if (res.ok) {
        alert('Dokumen berhasil ditolak.')
        setShowRejectModal(false)
        router.push('/dashboard')
      } else {
        alert(result.message || 'Gagal menolak dokumen')
      }
    } catch (error) {
      console.error('Reject error:', error)
      alert('Terjadi kesalahan server.')
    } finally {
      setRejecting(false)
    }
  }

  // Hak Akses Penandatanganan: Wajib Berurutan
  const isMyTurn = useMemo(() => {
    if (!currentUserId || !myRecipientInDoc) return false

    if (myRecipientInDoc.status === 'SIGNED' || myRecipientInDoc.status === 'REJECTED') {
      return false
    }

    const sortedRecipients = [...recipientsList].sort((a, b) => {
      const orderA = a.signingOrder ?? recipientsList.indexOf(a)
      const orderB = b.signingOrder ?? recipientsList.indexOf(b)
      return orderA - orderB
    })

    const currentActiveSigner = sortedRecipients.find(
      (r) => r.status !== 'SIGNED' && r.status !== 'REJECTED'
    )

    if (!currentActiveSigner) return false

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
      {/* Modal Penolakan Dokumen */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" /> Tolak Penandatanganan
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              Tuliskan alasan penolakan dokumen ini agar pengirim dapat mengetahuinya.
            </p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500"
            />

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={handleRejectDocument}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {rejecting ? 'Memproses...' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

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

        <div className="flex items-center gap-3">
          {/* Tombol Tolak */}
          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            disabled={submitting || !isMyTurn}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="h-4 w-4" /> Tolak Dokumen
          </button>

          {/* Tombol Kirim Tanda Tangan */}
          <button
            type="button"
            onClick={handleSign}
            disabled={submitting || !signatureData || !isMyTurn}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Memproses...' : 'Kirim Tanda Tangan'}
          </button>
        </div>
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
                
                {/* Overlay Fields */}
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
                        onMouseDown={isMine && sigMode === 'SPECIMEN' ? startSpecimenDrag : undefined}
                        onTouchStart={isMine && sigMode === 'SPECIMEN' ? startSpecimenDrag : undefined}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-1 z-10 box-border select-none ${
                          isMine 
                            ? `border-emerald-500 bg-emerald-500/10 text-emerald-600 ${sigMode === 'SPECIMEN' ? 'cursor-grab active:cursor-grabbing ring-2 ring-emerald-500/30' : ''}`
                            : 'border-blue-500 bg-blue-500/10 text-blue-500'
                        }`}
                      >
                        {isMine && signatureData ? (
                          <img src={signatureData} alt="Preview TTD" className="h-full w-full object-contain pointer-events-none select-none" />
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
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-3">
              {/* Selector Mode TTD */}
              <div className="flex gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setSigMode('DRAW')
                    clearCanvas()
                  }}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                    sigMode === 'DRAW' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Gores TTD
                </button>
                <button
                  type="button"
                  onClick={selectSpecimen}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                    sigMode === 'SPECIMEN' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Gunakan Spesimen
                </button>
              </div>

              {sigMode === 'DRAW' ? (
                <>
                  <p className="text-[11px] text-slate-400 italic">
                    Goreskan tanda tangan Anda di kotak putih (bayangan dokumen menampilkan posisi asli TTD):
                  </p>

                  {/* Kotak Canvas Pad dengan Background Mirroring Crop Dokumen */}
                  <div
                    className="relative w-full rounded-xl border-2 border-slate-700 bg-white overflow-hidden shadow-inner flex items-center justify-center"
                    style={{
                      aspectRatio: myField ? `${myField.width} / ${myField.height}` : '260 / 160',
                      backgroundImage: bgCropUrl ? `url(${bgCropUrl})` : undefined,
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    {/* Overlay semi-transparan putih agar teks dokumen redup & goresan TTD tajam */}
                    {bgCropUrl && <div className="absolute inset-0 bg-white/60 pointer-events-none" />}

                    {/* Canvas Foreground Transparan untuk Menggores */}
                    <canvas
                      ref={canvasRef}
                      width={myField ? myField.width * 2 : 520}
                      height={myField ? myField.height * 2 : 320}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" /> Bersihkan Papan
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-slate-400 italic">
                      Geser tanda tangan untuk memindahkan posisi, atau atur ukuran dengan slider di bawah:
                    </p>
                  </div>

                  {userSpecimen ? (
                    <>
                      {/* Box Interaktif dengan Background Mirroring Dokumen */}
                      <div
                        className="relative w-full rounded-xl border-2 border-slate-700 bg-white overflow-hidden shadow-inner flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
                        style={{
                          aspectRatio: myField ? `${myField.width} / ${myField.height}` : '260 / 160',
                          backgroundImage: bgCropUrl ? `url(${bgCropUrl})` : undefined,
                          backgroundSize: '100% 100%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                        onMouseDown={startSpecimenDrag}
                        onTouchStart={startSpecimenDrag}
                      >
                        {/* Overlay semi-transparan putih agar teks dokumen redup */}
                        {bgCropUrl && <div className="absolute inset-0 bg-white/60 pointer-events-none" />}

                        {/* Gambar Spesimen yang Bisa Digeser & Diatur Ukurannya */}
                        <div
                          className="absolute pointer-events-none transition-transform duration-75"
                          style={{
                            transform: `translate(${specimenPos.x}px, ${specimenPos.y}px) scale(${specimenScale / 100})`,
                            maxWidth: '85%',
                            maxHeight: '85%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <img
                            src={userSpecimen}
                            alt="Spesimen TTD"
                            className="max-h-full max-w-full object-contain drop-shadow-sm select-none"
                            draggable={false}
                          />
                        </div>

                        {/* Indikator Geser di Pojok */}
                        <div className="absolute bottom-1 right-1.5 rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-slate-300 pointer-events-none flex items-center gap-1 backdrop-blur-xs">
                          <Move className="h-2.5 w-2.5" /> Geser
                        </div>
                      </div>

                      {/* Slider Kontrol Ukuran */}
                      <div className="space-y-1.5 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-300 flex items-center gap-1">
                            <ZoomIn className="h-3 w-3 text-blue-400" /> Ukuran TTD
                          </span>
                          <span className="font-mono text-xs font-bold text-blue-400">{specimenScale}%</span>
                        </div>
                        <input
                          type="range"
                          min={40}
                          max={200}
                          step={5}
                          value={specimenScale}
                          onChange={(e) => setSpecimenScale(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>Kecil (40%)</span>
                          <span>Standar (100%)</span>
                          <span>Besar (200%)</span>
                        </div>
                      </div>

                      {/* Tombol Reset Posisi & Ukuran */}
                      <button
                        type="button"
                        onClick={() => {
                          setSpecimenPos({ x: 0, y: 0 })
                          setSpecimenScale(100)
                        }}
                        className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60"
                      >
                        <RotateCcw className="h-3 w-3" /> Kembalikan ke Posisi Awal
                      </button>
                    </>
                  ) : (
                    <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/30 text-center text-amber-300 text-xs">
                      Belum ada spesimen TTD tersimpan di profil Anda.
                    </div>
                  )}
                </div>
              )}
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
                    r.status === 'SIGNED' ? 'bg-emerald-500/10 text-emerald-400' : r.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'
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