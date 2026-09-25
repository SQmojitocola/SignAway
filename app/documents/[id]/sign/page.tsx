'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  RefreshCw,
  PenTool,
  CheckCircle2,
  XCircle,
  Move,
  ZoomIn,
  RotateCcw,
  Star,
  FileCheck,
  Check,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react'

interface Field {
  id: string
  recipientId: string
  recipientName: string
  type: 'SIGNATURE' | 'PARAF'
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

interface UserSpecimenItem {
  id: string
  type: 'SIGNATURE' | 'PARAF'
  imageUrl: string
  isPrimary: boolean
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

  // Pustaka Spesimen User
  const [userSpecimens, setUserSpecimens] = useState<UserSpecimenItem[]>([])
  const [activeSpecimenUrl, setActiveSpecimenUrl] = useState<string | null>(null)

  // MAP PENAMPUNG TTD/PARAF PER FIELD ID
  const [signaturesMap, setSignaturesMap] = useState<Record<string, string>>({})
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)

  // 📍 STATE CHECKLIST: Terapkan ke Semua Plot (Berlaku untuk DRAW & SPECIMEN)
  const [applyToAll, setApplyToAll] = useState<boolean>(false)

  // Mode Pengisian TTD
  const [sigMode, setSigMode] = useState<'DRAW' | 'SPECIMEN'>('DRAW')
  const [penColor, setPenColor] = useState<'#000000' | '#0B5369'>('#000000')
  const [bgCropUrl, setBgCropUrl] = useState<string | null>(null)

  // Manipulasi Spesimen (Ukuran & Posisi)
  const [specimenScale, setSpecimenScale] = useState<number>(100)
  const [specimenPos, setSpecimenPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const isDraggingSpecimenRef = useRef(false)
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  })

  // Modal Penolakan
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

  // Semua Field milik user ini
  const myFields = useMemo(() => {
    return fieldsList.filter((field) => {
      const recipient = recipientsList.find((r) => r.id === field.recipientId)
      return (
        field.recipientId === myRecipientInDoc?.id ||
        (recipient?.user?.id || recipient?.userId) === currentUserId ||
        (currentUserEmail && recipient?.user?.email === currentUserEmail)
      )
    })
  }, [fieldsList, recipientsList, myRecipientInDoc, currentUserId, currentUserEmail])

  // Field Aktif yang Sedang Dipilih User di Sidebar
  const activeField = useMemo(() => {
    return myFields.find((f) => f.id === selectedFieldId) || myFields[0] || null
  }, [myFields, selectedFieldId])

  // Spesimen yang COCOK KETAT dengan Tipe Field Aktif (SIGNATURE vs PARAF)
  const matchedSpecimens = useMemo(() => {
    if (!activeField) return []
    return userSpecimens.filter((s) => s.type === activeField.type)
  }, [userSpecimens, activeField])

  // Fetch data awal
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docRes, userRes, specRes] = await Promise.all([
          fetch(`/api/documents/${documentId}`),
          fetch('/api/users?me=true'),
          fetch('/api/specimens'),
        ])

        if (docRes.ok && userRes.ok) {
          const docData = await docRes.json()
          const userData = await userRes.json()

          const activeUser = userData.user || userData
          setCurrentUserId(activeUser.id)
          setCurrentUserEmail(activeUser.email)

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
              type: f.type || 'SIGNATURE',
              pageNumber: f.pageNumber || f.page || 1,
              posX: f.posX,
              posY: f.posY,
              width: f.width || 150,
              height: f.height || 70,
            }
          })

          setDoc({
            ...rawDoc,
            fields: normalizedFields,
          })
        }

        if (specRes.ok) {
          const specData = await specRes.json()
          setUserSpecimens(specData.specimens || [])
        }
      } catch (err) {
        console.error('Failed fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [documentId])

  // Auto-select field pertama saat data dimuat
  useEffect(() => {
    if (myFields.length > 0 && !selectedFieldId) {
      setSelectedFieldId(myFields[0].id)
    }
  }, [myFields, selectedFieldId])

  // Auto-select Spesimen Utama yang COCOK TIPE
  useEffect(() => {
    if (activeField && matchedSpecimens.length > 0) {
      const primarySpec = matchedSpecimens.find((s) => s.isPrimary) || matchedSpecimens[0]
      if (primarySpec) {
        setActiveSpecimenUrl(primarySpec.imageUrl)
      }
    } else {
      setActiveSpecimenUrl(null)
    }
  }, [activeField, matchedSpecimens])

  // Background Crop
  const captureMirrorBackground = useCallback(() => {
    if (!activeField) return
    const pageElement = pageRefs.current[activeField.pageNumber]
    const pdfCanvas = pageElement?.querySelector('canvas')
    if (!pdfCanvas) return

    try {
      const cropCanvas = document.createElement('canvas')
      const targetWidth = activeField.width || 150
      const targetHeight = activeField.height || 70
      cropCanvas.width = targetWidth
      cropCanvas.height = targetHeight

      const ctx = cropCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(
          pdfCanvas,
          activeField.posX,
          activeField.posY,
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
  }, [activeField])

  // Render PDF Pages
  useEffect(() => {
    if (!doc?.filePath) return

    let cancelled = false
    let renderTimer: ReturnType<typeof setTimeout> | undefined
    const renderTasks: Array<{ cancel: () => void }> = []

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

        if (cancelled) {
          await pdf.destroy()
          return
        }

        setPdfPages(pages)

        renderTimer = setTimeout(async () => {
          try {
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

              const renderTask = page.render({
                canvasContext: context,
                viewport: viewport,
              })
              renderTasks.push(renderTask)
              await renderTask.promise
            }
          } catch (err) {
            if (!cancelled) {
              console.error('Error rendering PDF page:', err)
            }
          }
        }, 100)
      } catch (err) {
        if (!cancelled) {
          console.error('Error rendering PDF:', err)
        }
      }
    }

    renderPdf()

    return () => {
      cancelled = true
      if (renderTimer) clearTimeout(renderTimer)
      renderTasks.forEach((renderTask) => renderTask.cancel())
    }
  }, [doc?.filePath])

  useEffect(() => {
    if (activeField && pdfPages.length > 0) {
      const timer = setTimeout(() => {
        captureMirrorBackground()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [activeField, pdfPages, captureMirrorBackground])

  // Drawing Canvas Handlers
  const getPointerCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.setPointerCapture(e.pointerId)

    const { x, y } = getPointerCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = penColor
    setIsDrawing(true)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    e.stopPropagation()

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const { x, y } = getPointerCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  // 📍 FUNGSI MENYIMPAN HASIL GORES (TERAPKAN SEMENTARA ATAU KE SEMUA PLOT BERDASARKAN CHECKLIST)
  const applyDrawResult = useCallback(
    (base64: string, applyAll: boolean) => {
      if (!activeField) return

      const targetFields = applyAll
        ? myFields.filter((f) => f.type === activeField.type)
        : [activeField]

      const newEntries: Record<string, string> = {}
      targetFields.forEach((f) => {
        newEntries[f.id] = base64
      })

      setSignaturesMap((prev) => ({
        ...prev,
        ...newEntries,
      }))
    },
    [activeField, myFields]
  )

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (canvas) {
      e.preventDefault()
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
    }

    setIsDrawing(false)
    if (canvas && activeField) {
      const base64 = canvas.toDataURL('image/png')
      applyDrawResult(base64, applyToAll)
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !activeField) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const targetFields = applyToAll
        ? myFields.filter((f) => f.type === activeField.type)
        : [activeField]

      setSignaturesMap((prev) => {
        const copy = { ...prev }
        targetFields.forEach((f) => {
          delete copy[f.id]
        })
        return copy
      })
    }
  }

  // Drag Spesimen
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

  // 📍 LOGIKA CEK / TERAPKAN SPESIMEN KE SEMUA PLOT
  const applySpecimenToFields = useCallback(
    (specimenUrl: string, targetType: 'SIGNATURE' | 'PARAF', applyAll: boolean) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const targetFields = applyAll
          ? myFields.filter((f) => f.type === targetType)
          : activeField
          ? [activeField]
          : []

        const newMapEntries: Record<string, string> = {}

        targetFields.forEach((field) => {
          const targetW = field.width || 150
          const targetH = field.height || 70

          const canvas = document.createElement('canvas')
          canvas.width = targetW * 2
          canvas.height = targetH * 2
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          const baseScale = Math.min((canvas.width * 0.85) / img.width, (canvas.height * 0.85) / img.height)
          const finalScale = baseScale * (specimenScale / 100)
          const drawW = img.width * finalScale
          const drawH = img.height * finalScale

          const centerX = canvas.width / 2 + specimenPos.x * 2
          const centerY = canvas.height / 2 + specimenPos.y * 2
          const drawX = centerX - drawW / 2
          const drawY = centerY - drawH / 2

          ctx.drawImage(img, drawX, drawY, drawW, drawH)
          newMapEntries[field.id] = canvas.toDataURL('image/png')
        })

        setSignaturesMap((prev) => ({
          ...prev,
          ...newMapEntries,
        }))
      }
      img.src = specimenUrl
    },
    [myFields, activeField, specimenScale, specimenPos]
  )

  useEffect(() => {
    if (sigMode === 'SPECIMEN' && activeSpecimenUrl && activeField) {
      applySpecimenToFields(activeSpecimenUrl, activeField.type, applyToAll)
    }
  }, [sigMode, activeSpecimenUrl, specimenPos, specimenScale, applySpecimenToFields, activeField, applyToAll])

  // Cek Kelengkapan Pengisian Semua Plot
  const isAllFieldsFilled = useMemo(() => {
    if (myFields.length === 0) return false
    return myFields.every((f) => Boolean(signaturesMap[f.id]))
  }, [myFields, signaturesMap])

  // Submit Penandatanganan
  const handleSign = async () => {
    if (!isAllFieldsFilled) {
      alert('Silakan lengkapi seluruh plot tanda tangan dan paraf Anda sebelum mengirim.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/documents/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          signaturesMap,
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

  // Submit Penolakan
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

    const currentActiveSigner = sortedRecipients.find((r) => r.status !== 'SIGNED' && r.status !== 'REJECTED')

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

  const isParafTask = activeField?.type === 'PARAF'

  return (
    <div className="flex h-screen w-full flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* Modal Penolakan */}
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
          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            disabled={submitting || !isMyTurn}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="h-4 w-4" /> Tolak Dokumen
          </button>

          <button
            type="button"
            onClick={handleSign}
            disabled={submitting || !isAllFieldsFilled || !isMyTurn}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting ? 'Memproses...' : 'Kirim Penandatanganan'}
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
                ref={(el) => {
                  pageRefs.current[page.pageNumber] = el
                }}
                className="relative bg-white shadow-2xl rounded-sm select-none"
                style={{ width: page.width, height: page.height }}
              >
                <canvas className="block" width={page.width} height={page.height} />

                {/* Overlay Fields */}
                {fieldsList
                  .filter((f) => f.pageNumber === page.pageNumber)
                  .map((field) => {
                    const recipient = recipientsList.find((r) => r.id === field.recipientId)
                    const isMine =
                      field.recipientId === myRecipientInDoc?.id ||
                      (recipient?.user?.id || recipient?.userId) === currentUserId ||
                      (currentUserEmail && recipient?.user?.email === currentUserEmail)
                    const isSigned = recipient?.status === 'SIGNED'
                    const isParaf = field.type === 'PARAF'
                    const isSelectedPlot = selectedFieldId === field.id
                    const filledData = signaturesMap[field.id]

                    return (
                      <div
                        key={field.id}
                        onClick={() => isMine && setSelectedFieldId(field.id)}
                        style={{
                          position: 'absolute',
                          left: `${field.posX}px`,
                          top: `${field.posY}px`,
                          width: `${field.width}px`,
                          height: `${field.height}px`,
                        }}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-1 z-10 box-border select-none transition-all cursor-pointer ${
                          isMine
                            ? isSelectedPlot
                              ? 'border-blue-500 bg-blue-500/20 ring-4 ring-blue-500/30'
                              : isParaf
                              ? 'border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                              : 'border-emerald-500 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                            : 'border-blue-500 bg-blue-500/10 text-blue-500'
                        }`}
                      >
                        {filledData ? (
                          <img
                            src={filledData}
                            alt="Preview"
                            className="h-full w-full object-contain pointer-events-none select-none"
                          />
                        ) : isSigned ? (
                          <div className="flex flex-col items-center opacity-40">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <span className="text-[8px] font-bold text-emerald-800 uppercase">
                              {field.recipientName}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center overflow-hidden p-0.5 w-full h-full">
                            {isParaf ? (
                              <FileCheck className="h-4 w-4 shrink-0 mb-0.5 text-amber-500" />
                            ) : (
                              <PenTool className="h-4 w-4 shrink-0 mb-0.5 text-emerald-500" />
                            )}
                            <p className="text-[10px] font-bold uppercase truncate w-full">
                              {field.recipientName} ({isParaf ? 'PARAF' : 'TTD'})
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

        {/* Sidebar Kanan Papan TTD */}
        <aside className="w-80 border-l border-slate-800 bg-slate-950 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* List Plot Milik User */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Daftar Tugas Plot Anda ({myFields.length})
            </h3>

            <div className="grid gap-1.5">
              {myFields.map((f, idx) => {
                const isFilled = Boolean(signaturesMap[f.id])
                const isSelected = selectedFieldId === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFieldId(f.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/40 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                      <span>Hlm {f.pageNumber}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                          f.type === 'PARAF'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {f.type}
                      </span>
                    </div>

                    {isFilled ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <Check className="h-3 w-3" /> Terisi
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-bold">Belum</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Area Pengisian TTD / Paraf */}
          {isMyTurn && activeField ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  {isParafTask ? (
                    <>
                      <FileCheck className="h-4 w-4 text-amber-500" /> Isi Paraf
                    </>
                  ) : (
                    <>
                      <PenTool className="h-4 w-4 text-emerald-500" /> Isi Tanda Tangan
                    </>
                  )}
                </h2>

                <span className="text-[9px] text-slate-400 font-mono">
                  Halaman {activeField.pageNumber}
                </span>
              </div>

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
                  Gores {isParafTask ? 'Paraf' : 'TTD'}
                </button>
                <button
                  type="button"
                  onClick={() => setSigMode('SPECIMEN')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                    sigMode === 'SPECIMEN' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Gunakan Spesimen
                </button>
              </div>

              {/* 📍 COMPONENT CHECKLIST SWITCHER TERAPKAN KE SEMUA PLOT (BERLAKU UNTUK DRAW & SPECIMEN) */}
              <div
                onClick={() => {
                  const nextState = !applyToAll
                  setApplyToAll(nextState)

                  // Jika sedang di mode Spesimen, langsung perbarui hasil penempatan
                  if (sigMode === 'SPECIMEN' && activeSpecimenUrl && activeField) {
                    applySpecimenToFields(activeSpecimenUrl, activeField.type, nextState)
                  }
                  // Jika sedang di mode Gores, jika ada isi di kanvas, langsung terapkan
                  else if (sigMode === 'DRAW' && canvasRef.current && activeField) {
                    const base64 = canvasRef.current.toDataURL('image/png')
                    if (signaturesMap[activeField.id]) {
                      applyDrawResult(base64, nextState)
                    }
                  }
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                  applyToAll
                    ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {applyToAll ? (
                    <CheckSquare className="h-4 w-4 text-blue-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-bold">Terapkan ke semua plot {isParafTask ? 'Paraf' : 'TTD'}</p>
                    <p className="text-[9px] text-slate-400">
                      {applyToAll
                        ? `Aksi ini akan mengisi ${
                            myFields.filter((f) => f.type === activeField.type).length
                          } plot ${isParafTask ? 'PARAF' : 'SIGNATURE'} sekaligus`
                        : 'Hanya mengisi plot yang sedang dipilih'}
                    </p>
                  </div>
                </div>
                {applyToAll && <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse shrink-0" />}
              </div>

              {sigMode === 'DRAW' ? (
                <>
                  <p className="text-[11px] text-slate-400 italic">
                    Goreskan {isParafTask ? 'paraf' : 'tanda tangan'} Anda di bawah:
                  </p>

                  <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/60 p-2">
                    <span className="text-[11px] font-semibold text-slate-300">Warna Tinta:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPenColor('#000000')}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                          penColor === '#000000'
                            ? 'bg-slate-700 text-white ring-2 ring-blue-500'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="h-3 w-3 rounded-full border border-slate-400 bg-black" />
                        Hitam
                      </button>
                      <button
                        type="button"
                        onClick={() => setPenColor('#0B5369')}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                          penColor === '#0B5369'
                            ? 'bg-slate-700 text-white ring-2 ring-blue-500'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="h-3 w-3 rounded-full border border-blue-300 bg-[#0B5369]" />
                        Biru
                      </button>
                    </div>
                  </div>

                  <div
                    className="relative w-full rounded-xl border-2 border-slate-700 bg-white overflow-hidden shadow-inner flex items-center justify-center select-none"
                    style={{
                      aspectRatio: `${activeField.width} / ${activeField.height}`,
                      backgroundImage: bgCropUrl ? `url(${bgCropUrl})` : undefined,
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    {bgCropUrl && <div className="absolute inset-0 bg-white/60 pointer-events-none" />}

                    <canvas
                      ref={canvasRef}
                      width={activeField.width * 2}
                      height={activeField.height * 2}
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      style={{ touchAction: 'none', userSelect: 'none' }}
                      className="absolute inset-0 w-full h-full cursor-crosshair select-none z-10"
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
                  <p className="text-[11px] text-slate-400 italic">
                    Pilih spesimen khusus bertipe <strong className="text-white">{isParafTask ? 'PARAF' : 'SIGNATURE'}</strong>:
                  </p>

                  {/* Pilihan Spesimen Sesuai Tipe */}
                  {matchedSpecimens.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {matchedSpecimens.map((item) => {
                        const isSelected = activeSpecimenUrl === item.imageUrl
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setActiveSpecimenUrl(item.imageUrl)
                              applySpecimenToFields(item.imageUrl, activeField.type, applyToAll)
                            }}
                            className={`relative shrink-0 h-12 w-20 rounded-lg border-2 p-1 bg-white cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 ring-2 ring-blue-500/30'
                                : 'border-slate-700 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={item.imageUrl} alt="Spesimen" className="h-full w-full object-contain" />
                            {item.isPrimary && (
                              <Star className="absolute top-0.5 right-0.5 h-3 w-3 fill-amber-400 text-amber-500" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center text-slate-400 text-[10px]">
                      Belum ada spesimen {isParafTask ? 'Paraf' : 'Tanda Tangan'} tersimpan di Atribut Pengesahan.
                    </div>
                  )}

                  {activeSpecimenUrl ? (
                    <>
                      <div
                        className="relative w-full rounded-xl border-2 border-slate-700 bg-white overflow-hidden shadow-inner flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
                        style={{
                          aspectRatio: `${activeField.width} / ${activeField.height}`,
                          backgroundImage: bgCropUrl ? `url(${bgCropUrl})` : undefined,
                          backgroundSize: '100% 100%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                        onMouseDown={startSpecimenDrag}
                        onTouchStart={startSpecimenDrag}
                      >
                        {bgCropUrl && <div className="absolute inset-0 bg-white/60 pointer-events-none" />}

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
                            src={activeSpecimenUrl}
                            alt="Spesimen"
                            className="max-h-full max-w-full object-contain drop-shadow-sm select-none"
                            draggable={false}
                          />
                        </div>

                        <div className="absolute bottom-1 right-1.5 rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-slate-300 pointer-events-none flex items-center gap-1 backdrop-blur-xs">
                          <Move className="h-2.5 w-2.5" /> Geser
                        </div>
                      </div>

                      <div className="space-y-1.5 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-300 flex items-center gap-1">
                            <ZoomIn className="h-3 w-3 text-blue-400" /> Ukuran {isParafTask ? 'Paraf' : 'TTD'}
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
                      </div>

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
                  ) : null}
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

          {/* Status Alur Dokumen */}
          <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status Alur Dokumen</h3>
            {recipientsList.map((r, idx) => {
              const isCurrentUser =
                r.id === myRecipientInDoc?.id ||
                (r.user?.id || r.userId) === currentUserId ||
                (currentUserEmail && r.user?.email === currentUserEmail)

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b border-slate-800/50 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                    <span className={`text-xs ${isCurrentUser ? 'font-bold text-white' : 'text-slate-300'}`}>
                      {r.user?.name || 'User'}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
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
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}