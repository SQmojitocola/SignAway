'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Send,
  Save,
  PenTool,
  X,
  FileCheck,
  Sliders,
  QrCode,
  ShieldCheck,
} from 'lucide-react'
import { FieldTypeSelectorModal, FieldPlotType } from '@/components/FieldTypeSelectorModal'

interface Recipient {
  id: string
  userId: string
  name: string
  email: string
  role?: string
}

interface ApiRecipient {
  id: string
  userId: string
  role?: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface ApiField {
  id: string
  recipientId: string
  type?: 'SIGNATURE' | 'PARAF' | 'AUDIT_STAMP'
  pageNumber: number
  posX: number
  posY: number
  width?: number
  height?: number
  recipient?: {
    user?: {
      name?: string
    }
  }
}

interface SignatureField {
  id: string
  recipientId: string
  recipientName: string
  type: 'SIGNATURE' | 'PARAF' | 'AUDIT_STAMP'
  pageNumber: number
  posX: number
  posY: number
  width: number
  height: number
}

interface FieldInteraction {
  mode: 'drag' | 'resize'
  fieldId: string
  initialPageNumber: number
  startX: number
  startY: number
  initialX: number
  initialY: number
  initialWidth: number
  initialHeight: number
  currentX: number
  currentY: number
  currentWidth: number
  currentHeight: number
  pointerId: number
}

interface PendingClickPlot {
  pageNumber: number
  posX: number
  posY: number
}

const PDF_VIEWPORT_SCALE = 1.25

interface RecipientColorTheme {
  border: string
  bg: string
  selectedBorder: string
  selectedBg: string
  ring: string
  badgeBg: string
  text: string
  icon: string
}

const RECIPIENT_COLOR_THEMES: RecipientColorTheme[] = [
  {
    border: 'border-blue-500',
    bg: 'bg-blue-50/70',
    selectedBorder: 'border-blue-600',
    selectedBg: 'bg-blue-50/90',
    ring: 'ring-blue-400',
    badgeBg: 'bg-[#1e4273]',
    text: 'text-blue-800',
    icon: 'text-blue-600',
  },
  {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50/70',
    selectedBorder: 'border-emerald-600',
    selectedBg: 'bg-emerald-50/90',
    ring: 'ring-emerald-400',
    badgeBg: 'bg-emerald-700',
    text: 'text-emerald-800',
    icon: 'text-emerald-600',
  },
  {
    border: 'border-purple-500',
    bg: 'bg-purple-50/70',
    selectedBorder: 'border-purple-600',
    selectedBg: 'bg-purple-50/90',
    ring: 'ring-purple-400',
    badgeBg: 'bg-purple-700',
    text: 'text-purple-800',
    icon: 'text-purple-600',
  },
  {
    border: 'border-rose-500',
    bg: 'bg-rose-50/70',
    selectedBorder: 'border-rose-600',
    selectedBg: 'bg-rose-50/90',
    ring: 'ring-rose-400',
    badgeBg: 'bg-rose-700',
    text: 'text-rose-800',
    icon: 'text-rose-600',
  },
  {
    border: 'border-indigo-500',
    bg: 'bg-indigo-50/70',
    selectedBorder: 'border-indigo-600',
    selectedBg: 'bg-indigo-50/90',
    ring: 'ring-indigo-400',
    badgeBg: 'bg-indigo-700',
    text: 'text-indigo-800',
    icon: 'text-indigo-600',
  },
]

function getRecipientTheme(idx: number): RecipientColorTheme {
  if (idx < 0) return RECIPIENT_COLOR_THEMES[0]
  return RECIPIENT_COLOR_THEMES[idx % RECIPIENT_COLOR_THEMES.length]
}

export default function DocumentFieldPlottingPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [documentTitle, setDocumentTitle] = useState('Memuat dokumen...')
  const [documentPath, setDocumentPath] = useState<string | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])

  // State Plotting
  const [fields, setFields] = useState<SignatureField[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [activeRecipient, setActiveRecipient] = useState<Recipient | null>(null)
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null)

  // State Pending Plot untuk Pemanggilan Pop-over Modal
  const [pendingPlot, setPendingPlot] = useState<PendingClickPlot | null>(null)

  const [loadingSave, setLoadingSave] = useState(false)
  const [pdfInteractive, setPdfInteractive] = useState(false)
  const [pdfPages, setPdfPages] = useState<Array<{ pageNumber: number; width: number; height: number }>>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [leaveDialogMode, setLeaveDialogMode] = useState<'back' | 'save'>('back')

  const pdfContainerRef = useRef<HTMLDivElement | null>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const fieldElementsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const interactionRef = useRef<FieldInteraction | null>(null)
  const fieldsRef = useRef(fields)

  useEffect(() => {
    fieldsRef.current = fields
  }, [fields])

  // 1. Render PDF.js Viewport
  useEffect(() => {
    if (!documentPath) return

    let cancelled = false
    const renderPdf = async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()
      const pdf = await pdfjs.getDocument(documentPath).promise
      const pages: Array<{ pageNumber: number; width: number; height: number }> = []

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale: PDF_VIEWPORT_SCALE })
        pages.push({ pageNumber, width: viewport.width, height: viewport.height })
      }

      if (!cancelled) setPdfPages(pages)
    }

    renderPdf().catch((error) => {
      console.error('PDF render error:', error)
      alert('Gagal menampilkan PDF')
    })

    return () => {
      cancelled = true
    }
  }, [documentPath])

  // 2. Render Canvas Per Halaman
  useEffect(() => {
    if (!documentPath || pdfPages.length === 0) return

    let cancelled = false
    const renderPages = async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()
      const pdf = await pdfjs.getDocument(documentPath).promise

      await Promise.all(
        pdfPages.map(async ({ pageNumber, width, height }) => {
          const page = await pdf.getPage(pageNumber)
          const pageElement = pageRefs.current[pageNumber]
          const canvas = pageElement?.querySelector('canvas')
          const context = canvas?.getContext('2d')
          if (!canvas || !context || cancelled) return

          canvas.width = width
          canvas.height = height
          await page.render({
            canvasContext: context,
            viewport: page.getViewport({ scale: PDF_VIEWPORT_SCALE }),
          }).promise
        })
      )
    }

    renderPages().catch((error) => console.error('PDF page render error:', error))
    return () => {
      cancelled = true
    }
  }, [documentPath, pdfPages])

  // 3. Prevent Unsaved Departure
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  const pdfPagesRef = useRef(pdfPages)
  useEffect(() => {
    pdfPagesRef.current = pdfPages
  }, [pdfPages])

  // 📍 4. OPTIMIZED DRAG & RESIZE INTERACTION LISTENER (INSTANT & PRECISE WITH CROSS-PAGE DETECTION)
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction) return

      const deltaX = event.clientX - interaction.startX
      const deltaY = event.clientY - interaction.startY
      const element = fieldElementsRef.current[interaction.fieldId]
      if (!element) return

      if (interaction.mode === 'drag') {
        interaction.currentX = interaction.initialX + deltaX
        interaction.currentY = interaction.initialY + deltaY
        // Transform GPU langsung tanpa delay
        element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`
      } else {
        interaction.currentWidth = Math.max(80, interaction.initialWidth + deltaX)
        interaction.currentHeight = Math.max(40, interaction.initialHeight + deltaY)
        element.style.width = `${interaction.currentWidth}px`
        element.style.height = `${interaction.currentHeight}px`
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction) return

      const element = fieldElementsRef.current[interaction.fieldId]
      if (element && element.hasPointerCapture(interaction.pointerId)) {
        element.releasePointerCapture(interaction.pointerId)
      }

      const mode = interaction.mode
      const fieldId = interaction.fieldId
      const nextW = interaction.currentWidth
      const nextH = interaction.currentHeight

      let targetPageNumber = interaction.initialPageNumber
      let finalPosX = interaction.initialX
      let finalPosY = interaction.initialY

      if (mode === 'drag') {
        let targetPageRect: DOMRect | null = null

        // 1. Deteksi halaman mana yang tepat berada di bawah kursor mouse saat dilepaskan
        for (const p of pdfPagesRef.current) {
          const el = pageRefs.current[p.pageNumber]
          if (el) {
            const rect = el.getBoundingClientRect()
            if (
              event.clientY >= rect.top &&
              event.clientY <= rect.bottom &&
              event.clientX >= rect.left - 50 &&
              event.clientX <= rect.right + 50
            ) {
              targetPageNumber = p.pageNumber
              targetPageRect = rect
              break
            }
          }
        }

        // 2. Jika dilepas di luar atau di area gap, cari halaman terdekat
        if (!targetPageRect) {
          let minDistance = Infinity
          for (const p of pdfPagesRef.current) {
            const el = pageRefs.current[p.pageNumber]
            if (el) {
              const rect = el.getBoundingClientRect()
              const dist = Math.abs(event.clientY - (rect.top + rect.bottom) / 2)
              if (dist < minDistance) {
                minDistance = dist
                targetPageNumber = p.pageNumber
                targetPageRect = rect
              }
            }
          }
        }

        const initialPageEl = pageRefs.current[interaction.initialPageNumber]
        const initialPageRect = initialPageEl ? initialPageEl.getBoundingClientRect() : targetPageRect

        if (targetPageRect && initialPageRect) {
          // Posisi screen top-left field saat awal drag
          const fieldScreenStartX = initialPageRect.left + interaction.initialX
          const fieldScreenStartY = initialPageRect.top + interaction.initialY

          // Offset grab point relatif ke ujung kiri-atas field
          const grabOffsetX = interaction.startX - fieldScreenStartX
          const grabOffsetY = interaction.startY - fieldScreenStartY

          // Posisi screen baru field saat dilepaskan
          const fieldNewScreenX = event.clientX - grabOffsetX
          const fieldNewScreenY = event.clientY - grabOffsetY

          // Konversi ke koordinat lokal di dalam halaman target
          const localX = fieldNewScreenX - targetPageRect.left
          const localY = fieldNewScreenY - targetPageRect.top

          const targetPageInfo = pdfPagesRef.current.find((p) => p.pageNumber === targetPageNumber)
          const maxW = Math.max(0, (targetPageInfo?.width || 744) - nextW)
          const maxH = Math.max(0, (targetPageInfo?.height || 1052) - nextH)

          finalPosX = Math.max(0, Math.min(maxW, localX))
          finalPosY = Math.max(0, Math.min(maxH, localY))

          // 📍 Smart Alignment Snapping: Kunci posisi agar presisi sejajar jika mendekati koordinat plot lain (toleransi 8px)
          const SNAP_THRESHOLD = 8
          const otherFieldsOnPage = fieldsRef.current.filter(
            (f) => f.id !== fieldId && f.pageNumber === targetPageNumber
          )
          for (const other of otherFieldsOnPage) {
            if (Math.abs(other.posY - finalPosY) <= SNAP_THRESHOLD) {
              finalPosY = other.posY
            }
            if (Math.abs(other.posX - finalPosX) <= SNAP_THRESHOLD) {
              finalPosX = other.posX
            }
          }
        }
      }

      interactionRef.current = null

      if (element) {
        element.style.removeProperty('transform')
      }

      setHasUnsavedChanges(true)
      setFields((currentFields) =>
        currentFields.map((field) => {
          if (field.id !== fieldId) return field
          return mode === 'drag'
            ? { ...field, pageNumber: targetPageNumber, posX: finalPosX, posY: finalPosY }
            : {
                ...field,
                width: nextW,
                height: nextH,
              }
        })
      )
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [])

  // 5. Load Data Dokumen & Field
  useEffect(() => {
    const loadDocument = async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Gagal memuat dokumen')

        setDocumentTitle(data.document.title)
        setDocumentPath(data.document.filePath)

        const validRecipients: Recipient[] = (data.document.recipients as ApiRecipient[]).map((r) => ({
          id: r.id,
          userId: r.userId,
          name: r.user.id === data.document.sender.id ? `${r.user.name} (Saya)` : r.user.name,
          email: r.user.email,
          role: r.role,
        }))

        setRecipients(validRecipients)

        // Load Field Koordinat dari DB
        const fieldsResponse = await fetch(`/api/documents/fields?documentId=${documentId}`)
        const fieldsData = await fieldsResponse.json()
        if (!fieldsResponse.ok) throw new Error(fieldsData.message || 'Gagal memuat posisi TTD')

        setFields(
          (fieldsData.fields as ApiField[]).map((field) => {
            const isAudit = field.type === 'AUDIT_STAMP'
            return {
              id: field.id,
              recipientId: field.recipientId || '',
              recipientName: isAudit ? 'Sistem E-Sign' : (field.recipient?.user?.name || 'Penandatangan'),
              type: field.type || 'SIGNATURE',
              pageNumber: field.pageNumber,
              posX: field.posX,
              posY: field.posY,
              width: field.width || (isAudit ? 220 : 150),
              height: field.height || (isAudit ? 65 : 70),
            }
          })
        )
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Gagal memuat dokumen')
      }
    }

    if (documentId) loadDocument()
  }, [documentId])

  // Klik Area Dokumen -> Membuka Modal Pilihan Tipe Plotting
  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (!activeRecipient) return
    if (!pdfContainerRef.current) return

    const pageElement = pageRefs.current[pageNumber]
    if (!pageElement) return
    const rect = pageElement.getBoundingClientRect()
    const posX = Math.max(0, e.clientX - rect.left - 75)
    const posY = Math.max(0, e.clientY - rect.top - 35)

    // Buka Modal Pemilihan Tipe (TTD atau Paraf)
    setPendingPlot({ pageNumber, posX, posY })
  }

  // METODE KONFIRMASI DARI MODAL TERPISAH
  const handleConfirmFieldType = (type: FieldPlotType) => {
    if (!pendingPlot) return

    const isAudit = type === 'AUDIT_STAMP'
    const newField: SignatureField = {
      id: `field-${crypto.randomUUID()}`,
      recipientId: isAudit ? '' : (activeRecipient?.id || ''),
      recipientName: isAudit ? 'Sistem E-Sign' : (activeRecipient?.name || 'Penandatangan'),
      type,
      pageNumber: pendingPlot.pageNumber,
      posX: pendingPlot.posX,
      posY: pendingPlot.posY,
      width: isAudit ? 220 : type === 'PARAF' ? 100 : 150,
      height: isAudit ? 65 : type === 'PARAF' ? 50 : 70,
    }

    setHasUnsavedChanges(true)
    setFields((currentFields) => {
      // Jika stempel audit sudah ada sebelumnya, ganti posisinya dengan yang baru
      if (isAudit) {
        return [...currentFields.filter((f) => f.type !== 'AUDIT_STAMP'), newField]
      }
      return [...currentFields, newField]
    })
    setSelectedFieldId(newField.id)
    setPendingPlot(null)
    setActiveRecipient(null)
  }

  // Helper untuk menambah atau mengarahkan ke Stempel Audit dari Sidebar
  const handleAddAuditStamp = () => {
    const existing = fields.find((f) => f.type === 'AUDIT_STAMP')
    if (existing) {
      setSelectedFieldId(existing.id)
      pageRefs.current[existing.pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // Cari halaman yang sedang paling nampak di layar user
    let targetPage = 1
    if (pdfPages.length > 0) {
      const windowCenterY = window.innerHeight / 2
      for (const p of pdfPages) {
        const el = pageRefs.current[p.pageNumber]
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= windowCenterY && rect.bottom >= windowCenterY) {
            targetPage = p.pageNumber
            break
          }
        }
      }
    }

    const targetPageInfo = pdfPages.find((p) => p.pageNumber === targetPage)
    const pageWidth = targetPageInfo?.width || 744
    const pageHeight = targetPageInfo?.height || 1052
    const initialWidth = 220
    const initialHeight = 65

    const newField: SignatureField = {
      id: `field-${crypto.randomUUID()}`,
      recipientId: '',
      recipientName: 'Sistem E-Sign',
      type: 'AUDIT_STAMP',
      pageNumber: targetPage,
      posX: Math.max(20, pageWidth - initialWidth - 40),
      posY: Math.max(20, pageHeight - initialHeight - 60),
      width: initialWidth,
      height: initialHeight,
    }

    setHasUnsavedChanges(true)
    setFields((prev) => [...prev, newField])
    setSelectedFieldId(newField.id)
    pageRefs.current[targetPage]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId)
  const visibleFields = selectedRecipientId
    ? fields.filter((field) => field.recipientId === selectedRecipientId || field.type === 'AUDIT_STAMP')
    : fields

  const canSend = recipients.length > 0 && recipients.every((recipient) =>
    fields.some((field) => field.recipientId === recipient.id)
  )

  const handleDeleteField = (fieldId: string) => {
    const targetField = fields.find((f) => f.id === fieldId)
    if (targetField) {
      setHasUnsavedChanges(true)
      setFields((currentFields) => currentFields.filter((f) => f.id !== fieldId))
    }
    setSelectedFieldId(null)
  }

  const handleUpdateFieldType = (fieldId: string, type: 'SIGNATURE' | 'PARAF') => {
    setHasUnsavedChanges(true)
    setFields((current) =>
      current.map((f) => {
        if (f.id !== fieldId) return f
        return {
          ...f,
          type,
          width: type === 'PARAF' ? 100 : 150,
          height: type === 'PARAF' ? 50 : 70,
        }
      })
    )
  }

  const handleLeaveEditor = async (mode: 'save' | 'discard') => {
    setShowLeaveDialog(false)

    if (mode === 'discard') {
      const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.message || 'Gagal membuang draft')
        return
      }

      router.push('/drafts')
      return
    }

    const saved = await handleSaveFields(false)
    if (saved) {
      setHasUnsavedChanges(false)
      if (leaveDialogMode === 'back') {
        router.push('/drafts')
      }
    }
  }

  const handleSaveFields = async (send = false) => {
    setLoadingSave(true)
    try {
      const res = await fetch('/api/documents/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, fields, send }),
      })

      if (!res.ok) throw new Error('Gagal menyimpan posisi TTD')
      return true
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan posisi TTD')
      return false
    } finally {
      setLoadingSave(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100 font-sans">
      {/* PEMANGGILAN KOMPONEN MODAL POP-OVER TERPISAH */}
      <FieldTypeSelectorModal
        isOpen={Boolean(pendingPlot)}
        recipientName={activeRecipient?.name}
        onClose={() => setPendingPlot(null)}
        onConfirm={handleConfirmFieldType}
      />

      {/* Dialog Unsaved Changes */}
      {showLeaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Perhatian</p>
            <h3 className="mt-2 text-xl font-bold text-slate-800">Dokumen belum disimpan</h3>
            <p className="mt-2 text-sm text-slate-600">
              {leaveDialogMode === 'save'
                ? 'Apakah ingin menyimpan perubahan ke draft?'
                : 'Mau disimpan ke draft atau dibuang?'}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => void handleLeaveEditor('save')}
                className="rounded-xl bg-[#1e4273] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
              >
                Simpan draft
              </button>
              <button
                type="button"
                onClick={() => void handleLeaveEditor('discard')}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
              >
                Buang
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveDialog(false)}
                className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!hasUnsavedChanges) {
                router.back()
                return
              }
              setLeaveDialogMode('back')
              setShowLeaveDialog(true)
            }}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-800">{documentTitle}</h1>
            <p className="text-[11px] text-slate-400">Penempatan Tanda Tangan & Paraf</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeRecipient) {
                setActiveRecipient(null)
                return
              }
              setPdfInteractive((current) => !current)
            }}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {activeRecipient
              ? 'Batal Tempatkan'
              : pdfInteractive
              ? 'Mode Tempatkan Plot'
              : 'Scroll / Zoom PDF'}
          </button>
          <button
            onClick={() => {
              if (!hasUnsavedChanges) {
                void handleSaveFields(false)
                return
              }
              setLeaveDialogMode('save')
              setShowLeaveDialog(true)
            }}
            disabled={loadingSave}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Save className="h-4 w-4" /> Simpan Draft
          </button>
          <button
            onClick={() => {
              handleSaveFields(true).then((saved) => {
                if (saved) {
                  router.replace(`/upload/success?documentId=${documentId}`)
                }
              })
            }}
            disabled={!canSend || loadingSave}
            className="flex items-center gap-2 rounded-xl bg-[#1e4273] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          >
            <Send className="h-4 w-4" /> Kirim untuk Ditandatangani
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Kiri: Daftar Penandatangan */}
        <aside className="w-72 border-r bg-white p-4 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Instruksi</h3>
            <p className="text-xs text-slate-500">
              Klik <span className="font-semibold text-blue-600">Tempatkan</span> lalu klik area dokumen untuk memilih menambah TTD atau Paraf.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Daftar Penandatangan</h3>

            {recipients.map((recipient, idx) => (
              <div
                key={recipient.id}
                className={`p-3 rounded-xl border transition-all ${
                  activeRecipient?.id === recipient.id || selectedRecipientId === recipient.id
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs ${getRecipientTheme(idx).badgeBg}`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{recipient.name}</p>
                    <p className="text-[10px] text-slate-500">{recipient.email}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2">
                  {(() => {
                    const recipientFieldCount = fields.filter((field) => field.recipientId === recipient.id).length
                    return recipientFieldCount > 0 ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {recipientFieldCount} plot ditempatkan
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Belum ditempatkan
                      </span>
                    )
                  })()}

                  <button
                    onClick={() => {
                      setPdfInteractive(false)
                      setActiveRecipient(recipient)
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {activeRecipient?.id === recipient.id ? 'Mencari Posisi...' : 'Tempatkan'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 📍 KARTU STEMPEL AUDIT (QR & DOC-ID) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Stempel Verifikasi
              </h3>
              {fields.some((f) => f.type === 'AUDIT_STAMP') && (
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                  Aktif
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              QR Code & Timestamp verifikasi keabsahan dokumen. Dapat diposisikan ke bagian dokumen mana pun.
            </p>

            {(() => {
              const auditField = fields.find((f) => f.type === 'AUDIT_STAMP')
              if (auditField) {
                return (
                  <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hal. {auditField.pageNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteField(auditField.id)}
                        className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFieldId(auditField.id)
                        pageRefs.current[auditField.pageNumber]?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        })
                      }}
                      className="w-full text-center py-1.5 text-xs font-bold text-emerald-700 bg-white rounded-lg border border-emerald-200 hover:bg-emerald-50 cursor-pointer shadow-xs"
                    >
                      Pilih & Atur Posisi
                    </button>
                  </div>
                )
              }
              return (
                <button
                  type="button"
                  onClick={handleAddAuditStamp}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <QrCode className="w-4 h-4 text-emerald-600" /> + Tempatkan Stempel Audit
                </button>
              )
            })()}
          </div>
        </aside>

        {/* Panel Tengah: Canvas PDF */}
        <main className="flex-1 bg-slate-200/70 p-8 overflow-y-auto flex justify-center">
          <div ref={pdfContainerRef} className="flex flex-col items-center gap-4 pb-8">
            {pdfPages.map((page) => (
              <div
                key={page.pageNumber}
                ref={(element) => {
                  pageRefs.current[page.pageNumber] = element
                }}
                onClick={(event) => handlePdfClick(event, page.pageNumber)}
                className={`relative shrink-0 bg-white shadow-xl select-none ${
                  activeRecipient ? 'cursor-crosshair ring-2 ring-blue-500 ring-offset-2' : 'cursor-default'
                }`}
                style={{ width: page.width, height: page.height }}
              >
                <canvas className="absolute inset-0 block" />

                {/* 📍 Garis Panduan Sejajar Horizontal (Alignment Guide Line) */}
                {selectedField &&
                  selectedField.pageNumber === page.pageNumber &&
                  fields.some(
                    (f) =>
                      f.id !== selectedField.id &&
                      f.pageNumber === page.pageNumber &&
                      Math.abs(f.posY - selectedField.posY) < 1
                  ) && (
                    <div
                      style={{
                        position: 'absolute',
                        top: `${selectedField.posY}px`,
                        left: 0,
                        right: 0,
                        height: '1px',
                        borderTop: '1.5px dashed #2563eb',
                        pointerEvents: 'none',
                        zIndex: 25,
                      }}
                    >
                      <span className="absolute -top-3 right-3 text-[9px] font-bold text-blue-700 bg-white/95 px-1.5 py-0.5 rounded border border-blue-200 shadow-xs">
                        Sejajar (Y: {Math.round(selectedField.posY)})
                      </span>
                    </div>
                  )}

                {/* 📍 Selalu render SEMUA field di halaman ini agar tidak ada plot yang invisible */}
                {fields
                  .filter((field) => field.pageNumber === page.pageNumber)
                  .map((field) => {
                    const isSelected = selectedFieldId === field.id
                    const isAudit = field.type === 'AUDIT_STAMP'
                    const isParaf = field.type === 'PARAF'
                    const recipientIndex = recipients.findIndex((r) => r.id === field.recipientId)
                    const theme = getRecipientTheme(recipientIndex)

                    if (isAudit) {
                      return (
                        <div
                          key={field.id}
                          ref={(element) => {
                            fieldElementsRef.current[field.id] = element
                          }}
                          onPointerDown={(event) => {
                            if (pdfInteractive || activeRecipient) return
                            event.preventDefault()
                            event.stopPropagation()

                            const el = fieldElementsRef.current[field.id]
                            if (el) el.setPointerCapture(event.pointerId)

                            setSelectedFieldId(field.id)
                            const interaction: FieldInteraction = {
                              mode: 'drag',
                              fieldId: field.id,
                              initialPageNumber: field.pageNumber,
                              startX: event.clientX,
                              startY: event.clientY,
                              initialX: field.posX,
                              initialY: field.posY,
                              initialWidth: field.width,
                              initialHeight: field.height,
                              currentX: field.posX,
                              currentY: field.posY,
                              currentWidth: field.width,
                              currentHeight: field.height,
                              pointerId: event.pointerId,
                            }
                            interactionRef.current = interaction
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFieldId(field.id)
                          }}
                          style={{
                            left: `${field.posX}px`,
                            top: `${field.posY}px`,
                            width: `${field.width}px`,
                            height: `${field.height}px`,
                          }}
                          className={`absolute z-10 rounded-md border bg-white shadow-sm p-2 flex items-center gap-2.5 select-none cursor-move ${
                            isSelected
                              ? 'border-emerald-600 ring-2 ring-emerald-400 shadow-md'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <div className="absolute -top-3 left-2 bg-emerald-800 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs pointer-events-none">
                            Stempel Verifikasi (Audit Trail)
                          </div>

                          <button
                            type="button"
                            aria-label="Hapus stempel"
                            onPointerDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              handleDeleteField(field.id)
                            }}
                            className="absolute -right-2.5 -top-2.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>

                          {/* Sisi Kiri: Preview QR Code */}
                          <div className="h-full aspect-square bg-slate-50 border border-slate-200 rounded p-1 flex items-center justify-center shrink-0 pointer-events-none">
                            <QrCode className="w-full h-full text-slate-800" />
                          </div>

                          {/* Sisi Kanan: Teks Persis Referensi Gambar */}
                          <div className="flex flex-col justify-center overflow-hidden min-w-0 pointer-events-none pr-1">
                            <p className="text-[10px] sm:text-[11px] font-extrabold text-[#2e7d32] leading-tight truncate">
                              Terverifikasi Sistem E-Sign
                            </p>
                            <p className="text-[8.5px] font-semibold text-slate-600 font-mono mt-0.5 truncate">
                              Doc ID : {documentId.toUpperCase().slice(0, 16)}
                            </p>
                            <p className="text-[8px] text-slate-500 font-mono truncate">
                              Timestamp: [Saat Pengesahan]
                            </p>
                          </div>

                          {/* Indikator Koordinat Real-Time saat Terpilih */}
                          {isSelected && (
                            <div className="absolute -bottom-2.5 left-2 bg-slate-800/90 text-white text-[8px] font-mono px-1.5 py-0.5 rounded shadow-xs pointer-events-none">
                              X: {Math.round(field.posX)} · Y: {Math.round(field.posY)}
                            </div>
                          )}

                          {isSelected && !pdfInteractive && (
                            <button
                              type="button"
                              aria-label="Ubah ukuran stempel"
                              onPointerDown={(event) => {
                                event.preventDefault()
                                event.stopPropagation()

                                const el = fieldElementsRef.current[field.id]
                                if (el) el.setPointerCapture(event.pointerId)

                                const interaction: FieldInteraction = {
                                  mode: 'resize',
                                  fieldId: field.id,
                                  initialPageNumber: field.pageNumber,
                                  startX: event.clientX,
                                  startY: event.clientY,
                                  initialX: field.posX,
                                  initialY: field.posY,
                                  initialWidth: field.width,
                                  initialHeight: field.height,
                                  currentX: field.posX,
                                  currentY: field.posY,
                                  currentWidth: field.width,
                                  currentHeight: field.height,
                                  pointerId: event.pointerId,
                                }
                                interactionRef.current = interaction
                              }}
                              className="absolute -bottom-1.5 -right-1.5 z-20 h-4 w-4 cursor-se-resize rounded-full bg-emerald-600 border border-white shadow"
                            />
                          )}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={field.id}
                        ref={(element) => {
                          fieldElementsRef.current[field.id] = element
                        }}
                        onPointerDown={(event) => {
                          if (pdfInteractive || activeRecipient) return
                          event.preventDefault()
                          event.stopPropagation()

                          const el = fieldElementsRef.current[field.id]
                          if (el) {
                            el.setPointerCapture(event.pointerId)
                          }

                          setSelectedFieldId(field.id)
                          const interaction: FieldInteraction = {
                            mode: 'drag',
                            fieldId: field.id,
                            initialPageNumber: field.pageNumber,
                            startX: event.clientX,
                            startY: event.clientY,
                            initialX: field.posX,
                            initialY: field.posY,
                            initialWidth: field.width,
                            initialHeight: field.height,
                            currentX: field.posX,
                            currentY: field.posY,
                            currentWidth: field.width,
                            currentHeight: field.height,
                            pointerId: event.pointerId,
                          }
                          interactionRef.current = interaction
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFieldId(field.id)
                        }}
                        style={{
                          left: `${field.posX}px`,
                          top: `${field.posY}px`,
                          width: `${field.width}px`,
                          height: `${field.height}px`,
                        }}
                        /* 📍 Menghapus `transition-all` agar pergerakan drag instan & tidak lag */
                        className={`absolute z-10 rounded-lg border-2 border-dashed p-2 flex flex-col items-center justify-center select-none cursor-move ${
                          isParaf
                            ? isSelected
                              ? 'border-amber-600 bg-amber-50/90 ring-2 ring-amber-400 shadow-md'
                              : 'border-amber-500 bg-amber-50/70'
                            : isSelected
                            ? `${theme.selectedBorder} ${theme.selectedBg} ring-2 ${theme.ring} shadow-md`
                            : `${theme.border} ${theme.bg}`
                        }`}
                      >
                        <div
                          className={`absolute -top-3 left-2 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs pointer-events-none ${
                            isParaf ? 'bg-amber-600' : theme.badgeBg
                          }`}
                        >
                          {field.recipientName} ({isParaf ? 'Paraf' : 'TTD'})
                        </div>

                        <button
                          type="button"
                          aria-label="Hapus plot"
                          onPointerDown={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleDeleteField(field.id)
                          }}
                          className="absolute -right-3 -top-3 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>

                        {isParaf ? (
                          <FileCheck className="w-4 h-4 text-amber-600 mb-0.5 pointer-events-none" />
                        ) : (
                          <PenTool className={`w-4 h-4 mb-0.5 pointer-events-none ${theme.icon}`} />
                        )}

                        <span
                          className={`text-[10px] font-bold pointer-events-none ${
                            isParaf ? 'text-amber-800' : theme.text
                          }`}
                        >
                          {isParaf ? 'Paraf di sini' : 'Tanda tangan di sini'}
                        </span>

                        {/* Indikator Koordinat Real-Time saat Terpilih */}
                        {isSelected && (
                          <div className="absolute -bottom-2.5 left-2 bg-slate-800/90 text-white text-[8px] font-mono px-1.5 py-0.5 rounded shadow-xs pointer-events-none">
                            X: {Math.round(field.posX)} · Y: {Math.round(field.posY)}
                          </div>
                        )}

                        {isSelected && !pdfInteractive && (
                          <button
                            type="button"
                            aria-label="Ubah ukuran plot"
                            onPointerDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()

                              const el = fieldElementsRef.current[field.id]
                              if (el) {
                                el.setPointerCapture(event.pointerId)
                              }

                              const interaction: FieldInteraction = {
                                mode: 'resize',
                                fieldId: field.id,
                                initialPageNumber: field.pageNumber,
                                startX: event.clientX,
                                startY: event.clientY,
                                initialX: field.posX,
                                initialY: field.posY,
                                initialWidth: field.width,
                                initialHeight: field.height,
                                currentX: field.posX,
                                currentY: field.posY,
                                currentWidth: field.width,
                                currentHeight: field.height,
                                pointerId: event.pointerId,
                              }
                              interactionRef.current = interaction
                            }}
                            className={`absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-tl ${
                              isParaf ? 'bg-amber-600' : theme.badgeBg
                            }`}
                          />
                        )}
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </main>

        {/* Sidebar Kanan: Properti Field */}
        <aside className="w-64 border-l bg-white p-4 space-y-6">
          <h3 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-blue-600" /> Properti Field
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-2">Filter Penandatangan</label>
              <select
                value={selectedRecipientId ?? ''}
                onChange={(event) => {
                  const recipientId = event.target.value || null
                  setSelectedRecipientId(recipientId)
                  setSelectedFieldId(null)
                }}
                className="mb-3 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Semua penandatangan</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name}
                  </option>
                ))}
              </select>

              {visibleFields.length > 0 ? (
                <div className="space-y-2">
                  {visibleFields.map((field, index) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => {
                        setSelectedFieldId(field.id)
                        setSelectedRecipientId(field.recipientId)
                      }}
                      className={`w-full rounded-lg border p-2 text-left text-[11px] transition-all ${
                        selectedFieldId === field.id
                          ? 'border-blue-500 bg-blue-50/80 shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                      }`}
                    >
                      <span className="flex items-center justify-between font-bold text-slate-700">
                        <span>
                          {index + 1}. {field.recipientName}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                            field.type === 'PARAF'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {field.type}
                        </span>
                      </span>
                      <span className="block text-slate-500 text-[10px] mt-1">
                        Halaman {field.pageNumber} · X: {Math.round(field.posX)} · Y: {Math.round(field.posY)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada plot ditempatkan.</p>
              )}
            </div>

            {selectedField ? (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ditugaskan Kepada</label>
                  <input
                    type="text"
                    disabled
                    value={selectedField.recipientName}
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs font-semibold text-slate-700"
                  />
                </div>

                {/* Switcher Tipe Field Terpilih */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Tipe Pengesahan</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleUpdateFieldType(selectedField.id, 'SIGNATURE')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedField.type === 'SIGNATURE'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <PenTool className="h-3 w-3" /> TTD
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateFieldType(selectedField.id, 'PARAF')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedField.type === 'PARAF'
                          ? 'bg-white text-amber-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileCheck className="h-3 w-3" /> Paraf
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}