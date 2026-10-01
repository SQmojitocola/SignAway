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
  ShieldCheck,
  ShieldAlert,
  QrCode,
} from 'lucide-react'
import ProxyRequestModal from '@/components/document/ProxyRequestModal'

interface Field {
  id: string
  recipientId: string
  recipientName: string
  type: 'SIGNATURE' | 'PARAF' | 'AUDIT_STAMP' | 'NAME'
  pageNumber: number
  posX: number
  posY: number
  width: number
  height: number
  fontSize?: number | null
  textAlign?: string | null
  value?: string | null
}

interface Recipient {
  id: string
  userId?: string
  status: string
  signingOrder?: number | null
  user: { id: string; name: string; email: string; nip?: string | null }
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

interface RawField {
  id: string
  recipientId: string
  type?: 'SIGNATURE' | 'PARAF' | 'AUDIT_STAMP' | 'NAME'
  pageNumber?: number
  page?: number
  posX: number
  posY: number
  width?: number
  height?: number
  fontSize?: number | null
  textAlign?: string | null
  recipient?: {
    user?: {
      name?: string
      nip?: string | null
    }
  }
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
  const [approvedProxy, setApprovedProxy] = useState<{
    id: string
    targetUser: { id: string; name: string }
  } | null>(null)

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

  // Modal Pengajuan Proxy (disembunyikan sementara out of system)
  const SHOW_PROXY_FEATURE = false
  const [showProxyModal, setShowProxyModal] = useState(false)

  const [pdfPages, setPdfPages] = useState<Array<{ pageNumber: number; width: number; height: number }>>([])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [isDrawing, setIsDrawing] = useState(false)

  const recipientsList = useMemo(() => doc?.recipients || [], [doc?.recipients])
  const fieldsList = useMemo(() => doc?.fields || [], [doc?.fields])

  // 1. Fetch data awal dokumen, user, spesimen, dan izin proxy secara bersamaan
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docRes, userRes, specRes, proxyRes] = await Promise.all([
          fetch(`/api/documents/${documentId}`),
          fetch('/api/users?me=true'),
          fetch(`/api/specimens?documentId=${documentId}`),
          fetch(`/api/proxy-requests/check?documentId=${documentId}`),
        ])

        if (proxyRes.ok) {
          const proxyData = await proxyRes.json()
          if (proxyData.approvedProxy) {
            setApprovedProxy(proxyData.approvedProxy)
          }
        }

        if (docRes.ok && userRes.ok) {
          const docData = await docRes.json()
          const userData = await userRes.json()

          const activeUser = userData.user || userData
          setCurrentUserId(activeUser.id)
          setCurrentUserEmail(activeUser.email)

          const rawDoc = docData.document || docData
          const recipients: Recipient[] = rawDoc.recipients || []

          const normalizedFields = ((rawDoc.fields || []) as RawField[]).map((f) => {
            const isAudit = f.type === 'AUDIT_STAMP'
            const isName = f.type === 'NAME'
            const isParaf = f.type === 'PARAF'
            let matchedRecipient = isAudit ? null : recipients.find((r) => r.id === f.recipientId)
            if (!isAudit && !matchedRecipient) {
              matchedRecipient = recipients.find((r) => r.user?.id === activeUser.id || r.userId === activeUser.id)
            }

            return {
              id: f.id,
              recipientId: isAudit ? '' : (matchedRecipient?.id || f.recipientId || ''),
              recipientName: isAudit ? 'Sistem E-Sign' : (matchedRecipient?.user?.name || f.recipient?.user?.name || 'Penandatangan'),
              type: f.type || 'SIGNATURE',
              pageNumber: f.pageNumber || f.page || 1,
              posX: f.posX,
              posY: f.posY,
              width: f.width || (isAudit ? 220 : isName ? 160 : isParaf ? 100 : 150),
              height: f.height || (isAudit ? 65 : isName ? 48 : isParaf ? 50 : 70),
              fontSize: f.fontSize || 10,
              textAlign: f.textAlign || 'center',
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

  // 2. Tentukan recipient aktif untuk sesi penandatanganan ini
  const myRecipientInDoc = useMemo(() => {
    if (!currentUserId) return null

    // A. Prioritaskan recipient langsung milik user saat ini yang BELUM ditandatangani
    const directUnsigned = recipientsList.find(
      (r) =>
        (r.user?.id === currentUserId ||
          r.userId === currentUserId ||
          (currentUserEmail && r.user?.email === currentUserEmail)) &&
        r.status !== 'SIGNED' &&
        r.status !== 'REJECTED'
    )
    if (directUnsigned) return directUnsigned

    // B. Jika user sendiri tidak punya slot belum sign, cari slot target proxy yang BELUM ditandatangani
    if (approvedProxy) {
      const proxyUnsigned = recipientsList.find(
        (r) =>
          (r.user?.id === approvedProxy.targetUser.id || r.userId === approvedProxy.targetUser.id) &&
          r.status !== 'SIGNED' &&
          r.status !== 'REJECTED'
      )
      if (proxyUnsigned) return proxyUnsigned
    }

    // C. Fallback jika semua sudah SIGNED: ambil slot langsung user
    const directFallback = recipientsList.find(
      (r) =>
        r.user?.id === currentUserId ||
        r.userId === currentUserId ||
        (currentUserEmail && r.user?.email === currentUserEmail)
    )
    if (directFallback) return directFallback

    // D. Fallback target proxy
    if (approvedProxy) {
      return (
        recipientsList.find(
          (r) => r.user?.id === approvedProxy.targetUser.id || r.userId === approvedProxy.targetUser.id
        ) || null
      )
    }

    return null
  }, [recipientsList, currentUserId, currentUserEmail, approvedProxy])

  // 3. Semua Field yang menjadi kewajiban aktif penandatanganan pada sesi ini
  const myFields = useMemo(() => {
    if (!myRecipientInDoc || myRecipientInDoc.status === 'SIGNED' || myRecipientInDoc.status === 'REJECTED') {
      return []
    }
    return fieldsList.filter((field) => {
      if (field.type === 'AUDIT_STAMP' || field.type === 'NAME') return false
      return field.recipientId === myRecipientInDoc.id
    })
  }, [fieldsList, myRecipientInDoc])

  // Field Aktif yang Sedang Dipilih User di Sidebar
  const activeField = useMemo(() => {
    return myFields.find((f) => f.id === selectedFieldId) || myFields[0] || null
  }, [myFields, selectedFieldId])

  // Spesimen yang COCOK KETAT dengan Tipe Field Aktif (SIGNATURE vs PARAF)
  const matchedSpecimens = useMemo(() => {
    if (!activeField) return []
    return userSpecimens.filter((s) => s.type === activeField.type)
  }, [userSpecimens, activeField])

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

  const activeFieldRef = useRef(activeField)
  useEffect(() => {
    activeFieldRef.current = activeField
  }, [activeField])

  // Background Crop
  const captureMirrorBackground = useCallback(() => {
    const currentField = activeFieldRef.current
    if (!currentField) return
    const pageElement = pageRefs.current[currentField.pageNumber]
    const pdfCanvas = pageElement?.querySelector('canvas')
    if (!pdfCanvas) return

    try {
      const targetWidth = currentField.width || 150
      const targetHeight = currentField.height || 70
      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = targetWidth * 2
      cropCanvas.height = targetHeight * 2

      const ctx = cropCanvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height)

        ctx.drawImage(
          pdfCanvas,
          Math.max(0, currentField.posX),
          Math.max(0, currentField.posY),
          targetWidth,
          targetHeight,
          0,
          0,
          cropCanvas.width,
          cropCanvas.height
        )
        const dataUrl = cropCanvas.toDataURL('image/png')
        setBgCropUrl(dataUrl)
      }
    } catch (err) {
      console.error('Mirror background error:', err)
    }
  }, [])

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

        const pdfUrl = doc.filePath.includes('?') ? `${doc.filePath}&t=${Date.now()}` : `${doc.filePath}?t=${Date.now()}`
        const pdf = await pdfjs.getDocument(pdfUrl).promise
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

              // Begitu halaman selesai dirender, langsung panggil capture background jika ini halaman field aktif
              if (activeFieldRef.current?.pageNumber === pageInfo.pageNumber) {
                captureMirrorBackground()
              }
            }

            // Panggil sekali lagi setelah seluruh dokumen selesai dirender
            captureMirrorBackground()
          } catch (err) {
            if (!cancelled) {
              console.error('Error rendering PDF page:', err)
            }
          }
        }, 80)
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
  }, [doc?.filePath, captureMirrorBackground])

  useEffect(() => {
    if (activeField) {
      captureMirrorBackground()
      const timer = setTimeout(captureMirrorBackground, 120)
      return () => clearTimeout(timer)
    }
  }, [activeField, captureMirrorBackground])

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
    ctx.lineWidth = 4
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
    (specimenUrl: string, targetType: Field['type'], applyAll: boolean, colorOverride?: '#000000' | '#0B5369') => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const targetFields = applyAll
          ? myFields.filter((f) => f.type === targetType)
          : activeField
          ? [activeField]
          : []

        const newMapEntries: Record<string, string> = {}
        const effectiveColor = colorOverride || penColor

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

          if (effectiveColor === '#0B5369') {
            ctx.globalCompositeOperation = 'source-in'
            ctx.fillStyle = '#0B5369'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.globalCompositeOperation = 'source-over'
          }

          newMapEntries[field.id] = canvas.toDataURL('image/png')
        })

        setSignaturesMap((prev) => ({
          ...prev,
          ...newMapEntries,
        }))
      }
      img.src = specimenUrl
    },
    [myFields, activeField, specimenScale, specimenPos, penColor]
  )

  // 📍 HANDLE GANTI WARNA TINTA (RECOLOR INSTAN UNTUK GORES & SPESIMEN)
  const handleColorChange = useCallback(
    (newColor: '#000000' | '#0B5369') => {
      setPenColor(newColor)

      if (sigMode === 'DRAW') {
        const canvas = canvasRef.current
        if (canvas && activeField) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            let hasPixels = false
            for (let i = 3; i < imgData.data.length; i += 4) {
              if (imgData.data[i] > 10) {
                hasPixels = true
                break
              }
            }
            if (hasPixels) {
              ctx.globalCompositeOperation = 'source-in'
              ctx.fillStyle = newColor
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.globalCompositeOperation = 'source-over'

              const base64 = canvas.toDataURL('image/png')
              applyDrawResult(base64, applyToAll)
            }
          }
        }
      } else if (sigMode === 'SPECIMEN') {
        if (activeSpecimenUrl && activeField) {
          applySpecimenToFields(activeSpecimenUrl, activeField.type, applyToAll, newColor)
        }
      }
    },
    [sigMode, activeField, applyToAll, applyDrawResult, activeSpecimenUrl, applySpecimenToFields]
  )

  useEffect(() => {
    if (sigMode === 'SPECIMEN' && activeSpecimenUrl && activeField) {
      applySpecimenToFields(activeSpecimenUrl, activeField.type, applyToAll, penColor)
    }
  }, [sigMode, activeSpecimenUrl, specimenPos, specimenScale, applySpecimenToFields, activeField, applyToAll, penColor])

  // Restore hasil goresan ke kanvas saat berpindah field aktif atau mode DRAW
  useEffect(() => {
    if (sigMode === 'DRAW' && canvasRef.current && activeField) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const saved = signaturesMap[activeField.id]
        if (saved) {
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          }
          img.src = saved
        }
      }
    }
  }, [activeField?.id, sigMode])

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
      (currentUserEmail && currentActiveSigner.user?.email === currentUserEmail) ||
      (approvedProxy && (currentActiveSigner.user?.id === approvedProxy.targetUser.id || currentActiveSigner.userId === approvedProxy.targetUser.id))
    )
  }, [currentUserId, currentUserEmail, myRecipientInDoc, recipientsList, approvedProxy])

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
                    if (field.type === 'AUDIT_STAMP') {
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
                          className="flex items-center gap-2.5 rounded-md border border-slate-300 bg-white shadow-sm p-2 z-10 box-border select-none"
                        >
                          <div className="absolute -top-3 left-2 bg-emerald-800 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs pointer-events-none">
                            Stempel Verifikasi
                          </div>
                          <div className="h-full aspect-square bg-slate-50 border border-slate-200 rounded p-1 flex items-center justify-center shrink-0">
                            <QrCode className="w-full h-full text-slate-800" />
                          </div>
                          {/* Sisi Kanan: Logo E-Sign Terverifikasi (Persis Gambar Opsi 3) */}
                          <div className="flex-1 h-full flex items-center justify-center pointer-events-none p-0.5 overflow-hidden">
                            <img src="/assets/watermark.png" alt="E-Sign Terverifikasi" className="max-h-full max-w-full object-contain" />
                          </div>
                        </div>
                      )
                    }

                    if (field.type === 'NAME') {
                      const recipient = recipientsList.find((r) => r.id === field.recipientId)
                      const displayName = (recipient?.user?.name || field.recipientName || 'Penandatangan').replace(' (Saya)', '')
                      const displayNip = recipient?.user?.nip || null
                      const isMine = myRecipientInDoc?.id === field.recipientId

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
                          className={`rounded-md border p-1.5 flex flex-col justify-center z-10 box-border select-none ${
                            isMine
                              ? 'border-indigo-400 bg-white/95 shadow-xs'
                              : 'border-slate-300 bg-white/85'
                          }`}
                        >
                          <div className="absolute -top-3 left-2 bg-indigo-700 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs pointer-events-none">
                            {displayName} (Nama & NIK)
                          </div>
                          <div
                            className={`w-full flex flex-col justify-center pointer-events-none overflow-hidden px-1 ${
                              field.textAlign === 'left' ? 'items-start text-left' : 'items-center text-center'
                            }`}
                            style={{
                              fontSize: `${field.fontSize || 10}px`,
                              lineHeight: 1.25,
                            }}
                          >
                            <span className="font-bold tracking-wide uppercase underline text-slate-900 truncate max-w-full">
                              {displayName}
                            </span>
                            {displayNip && (
                              <span className="font-semibold text-slate-700 font-mono tracking-tight mt-0.5 text-[0.9em] truncate max-w-full">
                                {displayNip}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    }

                    const recipient = recipientsList.find((r) => r.id === field.recipientId)
                    const isSigned = recipient?.status === 'SIGNED'
                    const isMine = myFields.some((f) => f.id === field.id)
                    const isParaf = field.type === 'PARAF'
                    const isSelectedPlot = selectedFieldId === field.id
                    const filledData = signaturesMap[field.id]

                    return (
                      <div
                        key={field.id}
                        onClick={() => !isSigned && isMine && setSelectedFieldId(field.id)}
                        style={{
                          position: 'absolute',
                          left: `${field.posX}px`,
                          top: `${field.posY}px`,
                          width: `${field.width}px`,
                          height: `${field.height}px`,
                        }}
                        className={`flex flex-col items-center justify-center rounded-lg p-1 z-10 box-border select-none transition-all relative overflow-hidden ${
                          isSigned
                            ? 'border border-emerald-500/40 bg-emerald-500/5 cursor-default'
                            : isMine
                            ? isSelectedPlot
                              ? 'border-2 border-dashed border-blue-500 bg-blue-500/20 ring-4 ring-blue-500/30 cursor-pointer'
                              : isParaf
                              ? 'border-2 border-dashed border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 cursor-pointer'
                              : 'border-2 border-dashed border-emerald-500 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer'
                            : 'border-2 border-dashed border-slate-700/50 bg-slate-800/10 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {filledData ? (
                          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                            {!isParaf && field.textAlign !== 'none' && (
                              field.textAlign === 'corner' ? (
                                <img src="/assets/watermark.png" alt="watermark" className="absolute bottom-1 right-1 h-3.5 object-contain pointer-events-none z-0" />
                              ) : (
                                <img src="/assets/watermark.png" alt="watermark" className="absolute inset-0 m-auto max-h-[65%] max-w-[85%] object-contain opacity-20 pointer-events-none z-0" />
                              )
                            )}
                            <img
                              src={filledData}
                              alt="Preview"
                              className="relative z-10 h-full w-full object-contain pointer-events-none select-none"
                            />
                          </div>
                        ) : isSigned ? (
                          <div className="flex flex-col items-center justify-center p-1 w-full h-full pointer-events-none">
                            <div className="flex items-center gap-1 text-emerald-700 font-bold text-[9px] bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 shadow-xs">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[120px] uppercase">{field.recipientName}</span>
                            </div>
                            <span className="text-[7.5px] font-semibold text-emerald-600/80 mt-0.5">Sudah Ditandatangani</span>
                          </div>
                        ) : (
                          <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden p-0.5">
                            {!isParaf && field.textAlign !== 'none' && (
                              field.textAlign === 'corner' ? (
                                <img src="/assets/watermark.png" alt="watermark" className="absolute bottom-1 right-1 h-3.5 object-contain pointer-events-none z-0" />
                              ) : (
                                <img src="/assets/watermark.png" alt="watermark" className="absolute inset-0 m-auto max-h-[60%] max-w-[80%] object-contain opacity-20 pointer-events-none z-0" />
                              )
                            )}
                            <div className="relative z-10 flex flex-col items-center justify-center">
                              {isParaf ? (
                                <FileCheck className="h-4 w-4 shrink-0 mb-0.5 text-amber-500" />
                              ) : (
                                <PenTool className="h-4 w-4 shrink-0 mb-0.5 text-emerald-500" />
                              )}
                              <p className="text-[10px] font-bold uppercase truncate w-full">
                                {field.recipientName} ({isParaf ? 'PARAF' : 'TTD'})
                              </p>
                            </div>
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
          {approvedProxy && (
            <div className="p-3 mb-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold">Izin Perwakilan Disetujui Admin</p>
                <p className="text-[10px] text-blue-700">
                  Anda menandatangani sebagai wakil resmi untuk <strong>{approvedProxy.targetUser.name}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* List Plot Milik User / Target Proxy */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Daftar Tugas Plot {approvedProxy && myRecipientInDoc?.id !== currentUserId && myRecipientInDoc?.userId !== currentUserId ? `${approvedProxy.targetUser.name} (Wakil)` : 'Anda'} ({myFields.length})
            </h3>

            {myFields.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-slate-200">Tidak Ada Tugas Plot Aktif</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Semua plot yang menjadi kewajiban Anda pada dokumen ini telah selesai ditandatangani.
                </p>
              </div>
            ) : (
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
            )}
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

              {/* 📍 PILIHAN WARNA TINTA (Berlaku untuk Gores TTD & Spesimen) */}
              <div className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/60 p-2">
                <span className="text-[11px] font-semibold text-slate-300">Warna Tinta:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleColorChange('#000000')}
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
                    onClick={() => handleColorChange('#0B5369')}
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
                    {bgCropUrl && <div className="absolute inset-0 bg-white/35 pointer-events-none" />}

                    {/* Watermark preview in drawing canvas */}
                    {!isParafTask && activeField.textAlign !== 'none' && (
                      activeField.textAlign === 'corner' ? (
                        <img
                          src="/assets/watermark.png"
                          alt="watermark"
                          className="absolute bottom-2 right-2 h-5 object-contain pointer-events-none z-0 select-none"
                        />
                      ) : (
                        <img
                          src="/assets/watermark.png"
                          alt="watermark"
                          className="absolute inset-0 m-auto max-h-[55%] max-w-[75%] object-contain opacity-20 pointer-events-none z-0 select-none"
                        />
                      )
                    )}

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
                            <img
                              src={item.imageUrl}
                              alt="Spesimen"
                              className="h-full w-full object-contain"
                              style={{
                                filter:
                                  penColor === '#0B5369'
                                    ? 'brightness(0) saturate(100%) invert(26%) sepia(61%) saturate(1912%) hue-rotate(163deg) brightness(93%) contrast(96%)'
                                    : 'none',
                              }}
                            />
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
                        {bgCropUrl && <div className="absolute inset-0 bg-white/35 pointer-events-none" />}

                        {/* Watermark preview in specimen box */}
                        {!isParafTask && activeField.textAlign !== 'none' && (
                          activeField.textAlign === 'corner' ? (
                            <img
                              src="/assets/watermark.png"
                              alt="watermark"
                              className="absolute bottom-2 right-2 h-5 object-contain pointer-events-none z-0 select-none"
                            />
                          ) : (
                            <img
                              src="/assets/watermark.png"
                              alt="watermark"
                              className="absolute inset-0 m-auto max-h-[55%] max-w-[75%] object-contain opacity-20 pointer-events-none z-0 select-none"
                            />
                          )
                        )}

                        <div
                          className="absolute pointer-events-none transition-transform duration-75 z-10"
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
                            style={{
                              filter:
                                penColor === '#0B5369'
                                  ? 'brightness(0) saturate(100%) invert(26%) sepia(61%) saturate(1912%) hue-rotate(163deg) brightness(93%) contrast(96%)'
                                  : 'none',
                            }}
                            draggable={false}
                          />
                        </div>

                        <div className="absolute bottom-1 right-1.5 rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-slate-300 pointer-events-none flex items-center gap-1 backdrop-blur-xs z-20">
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
            <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-4 space-y-3">
              <p className="text-xs text-amber-200/80 leading-relaxed">
                {!myRecipientInDoc
                  ? 'Anda belum terdaftar sebagai penandatangan aktif pada dokumen ini. Jika pejabat/karyawan yang bersangkutan berhalangan, Anda dapat mengajukan izin perwakilan (proxy) kepada Administrator.'
                  : myRecipientInDoc.status === 'SIGNED'
                  ? 'Anda telah selesai menandatangani dokumen ini.'
                  : 'Belum giliran Anda untuk menandatangani dokumen ini.'}
              </p>
              {SHOW_PROXY_FEATURE && !myRecipientInDoc && doc && (
                <button
                  type="button"
                  onClick={() => setShowProxyModal(true)}
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                >
                  <ShieldAlert className="h-4 w-4 text-amber-300" /> Ajukan Izin Mewakili (Proxy)
                </button>
              )}
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

      {/* Modal Pengajuan Proxy (Disembunyikan sementara) */}
      {SHOW_PROXY_FEATURE && doc && (
        <ProxyRequestModal
          isOpen={showProxyModal}
          onClose={() => setShowProxyModal(false)}
          documentId={doc.id}
          documentTitle={doc.title}
          recipients={doc.recipients}
          onSuccess={() => {
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}