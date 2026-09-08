'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertTriangle, Send, Save, PenTool, X } from 'lucide-react'

interface Recipient {
  id: string
  name: string
  email: string
  role?: string
}

const SELF_RECIPIENT_ID = 'self'

interface SignatureField {
  id: string
  recipientId: string
  recipientName: string
  type: 'SIGNATURE' | 'PARAF'
  pageNumber: number
  posX: number
  posY: number
  width: number
  height: number
}

interface FieldInteraction {
  mode: 'drag' | 'resize'
  fieldId: string
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
}

export default function DocumentFieldPlottingPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [documentTitle, setDocumentTitle] = useState('Memuat dokumen...')
  const [documentPath, setDocumentPath] = useState<string | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selfRecipient, setSelfRecipient] = useState<Recipient | null>(null)

  // State Plotting
  const [fields, setFields] = useState<SignatureField[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [activeRecipient, setActiveRecipient] = useState<Recipient | null>(null)
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null)
  const [loadingSave, setLoadingSave] = useState(false)
  const [pdfInteractive, setPdfInteractive] = useState(false)
  const [pdfPages, setPdfPages] = useState<Array<{ pageNumber: number; width: number; height: number }>>([])

  const pdfContainerRef = useRef<HTMLDivElement | null>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const fieldElementsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const interactionRef = useRef<FieldInteraction | null>(null)

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
        const viewport = page.getViewport({ scale: 1.25 })
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

      await Promise.all(pdfPages.map(async ({ pageNumber, width, height }) => {
        const page = await pdf.getPage(pageNumber)
        const pageElement = pageRefs.current[pageNumber]
        const canvas = pageElement?.querySelector('canvas')
        const context = canvas?.getContext('2d')
        if (!canvas || !context || cancelled) return

        canvas.width = width
        canvas.height = height
        await page.render({
          canvas,
          canvasContext: context,
          viewport: page.getViewport({ scale: 1.25 }),
        }).promise
      }))
    }

    renderPages().catch((error) => console.error('PDF page render error:', error))
    return () => {
      cancelled = true
    }
  }, [documentPath, pdfPages])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction) return

      const deltaX = event.clientX - interaction.startX
      const deltaY = event.clientY - interaction.startY
      const element = fieldElementsRef.current[interaction.fieldId]
      if (!element) return

      if (interaction.mode === 'drag') {
        interaction.currentX = Math.max(0, interaction.initialX + deltaX)
        interaction.currentY = Math.max(0, interaction.initialY + deltaY)
        element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`
      } else {
        interaction.currentWidth = Math.max(80, interaction.initialWidth + deltaX)
        interaction.currentHeight = Math.max(40, interaction.initialHeight + deltaY)
        element.style.width = `${interaction.currentWidth}px`
        element.style.height = `${interaction.currentHeight}px`
      }
    }

    const handlePointerUp = () => {
      const interaction = interactionRef.current
      if (!interaction) return

      const nextX = interaction.currentX
      const nextY = interaction.currentY
      const element = fieldElementsRef.current[interaction.fieldId]

      setFields((currentFields) => currentFields.map((field) => {
        if (field.id !== interaction.fieldId) return field
        return interaction.mode === 'drag'
          ? { ...field, posX: nextX, posY: nextY }
          : {
            ...field,
            width: interaction.currentWidth,
            height: interaction.currentHeight,
          }
      }))
      interactionRef.current = null
      window.requestAnimationFrame(() => {
        element?.style.removeProperty('transform')
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  useEffect(() => {
    const loadDocument = async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Gagal memuat dokumen')

        setDocumentTitle(data.document.title)
        setDocumentPath(data.document.filePath)
        setSelfRecipient({
          id: SELF_RECIPIENT_ID,
          name: data.document.sender.name,
          email: data.document.sender.email,
        })
        setRecipients(
          data.document.recipients
            .filter((recipient: { user: { id: string } }) => recipient.user.id !== data.document.sender.id)
            .map((recipient: { id: string; user: { id: string; name: string; email: string } }) => ({
              id: recipient.id,
              name: recipient.user.name,
              email: recipient.user.email,
            }))
        )

        const fieldsResponse = await fetch(`/api/documents/fields?documentId=${documentId}`)
        const fieldsData = await fieldsResponse.json()
        if (!fieldsResponse.ok) throw new Error(fieldsData.message || 'Gagal memuat posisi TTD')

        setFields(fieldsData.fields.map((field: {
            id: string
            recipientId: string
            recipient: { user: { id: string; name: string } }
            pageNumber: number
            posX: number
            posY: number
            width: number
            height: number
          }) => ({
            id: field.id,
            recipientId: field.recipient.user.id === data.document.sender.id
              ? SELF_RECIPIENT_ID
              : field.recipientId,
            recipientName: field.recipient.user.name,
            type: 'SIGNATURE',
            pageNumber: field.pageNumber,
            posX: field.posX,
            posY: field.posY,
            width: field.width,
            height: field.height,
          })))
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Gagal memuat dokumen')
      }
    }

    if (documentId) loadDocument()
  }, [documentId])

  // Klik Area Dokumen untuk Menempatkan Kotak TTD
  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (!activeRecipient) return
    if (!pdfContainerRef.current) return

    const pageElement = pageRefs.current[pageNumber]
    if (!pageElement) return
    const rect = pageElement.getBoundingClientRect()
    const posX = e.clientX - rect.left - 75 // Sentralkan kotak
    const posY = e.clientY - rect.top - 35

    const newField: SignatureField = {
      id: `field-${crypto.randomUUID()}`,
      recipientId: activeRecipient.id,
      recipientName: activeRecipient.name,
      type: 'SIGNATURE',
      pageNumber,
      posX: Math.max(0, posX),
      posY: Math.max(0, posY),
      width: 150,
      height: 70,
    }

    setFields((currentFields) => [...currentFields, newField])
    setSelectedFieldId(newField.id)
    setActiveRecipient(null)
  }

  // Ambil Field yang Sedang Dipilih
  const selectedField = fields.find((f) => f.id === selectedFieldId)
  const visibleFields = selectedRecipientId
    ? fields.filter((field) => field.recipientId === selectedRecipientId)
    : fields
  const canSend = recipients.length > 0 && recipients.every((recipient) =>
    fields.some((field) => field.recipientId === recipient.id)
  )

  // Hapus Field TTD
  const handleDeleteField = (fieldId: string) => {
    const targetField = fields.find((f) => f.id === fieldId)
    if (targetField) {
      setFields((currentFields) => currentFields.filter((f) => f.id !== fieldId))
    }
    setSelectedFieldId(null)
  }

  // Simpan Koordinat ke Database via API Backend
  const handleSaveFields = async (send = false) => {
    setLoadingSave(true)
    try {
      const res = await fetch('/api/documents/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, fields, send }),
      })

      if (!res.ok) throw new Error('Gagal menyimpan posisi TTD')
      alert('Posisi TTD berhasil disimpan!')
      return true
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan posisi TTD')
      return false
    } finally {
      setLoadingSave(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* Top Navbar Editor */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-800">{documentTitle}</h1>
            <p className="text-[11px] text-slate-400">Penempatan Tanda Tangan</p>
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
                ? 'Mode Tempatkan TTD'
                : 'Scroll / Zoom PDF'}
          </button>
          <button
            onClick={() => { void handleSaveFields() }}
            disabled={loadingSave}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Save className="h-4 w-4" /> Simpan Posisi
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
            className="flex items-center gap-2 rounded-xl bg-[#1e4273] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Kirim untuk Ditandatangani
          </button>
        </div>
      </header>

      {/* Main Workspace (3 Kolom Grid) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel Kiri: Daftar Penandatangan */}
        <aside className="w-72 border-r bg-white p-4 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Instruksi</h3>
            <p className="text-xs text-slate-500">
              Klik <span className="font-semibold text-blue-600">Tempatkan</span> lalu klik area dokumen untuk menaruh kotak TTD.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Daftar Penandatangan</h3>

            {[...(selfRecipient ? [selfRecipient] : []), ...recipients].map((recipient, idx) => (
              <div
                key={recipient.id}
                className={`p-3 rounded-xl border transition-all ${
                  activeRecipient?.id === recipient.id || selectedRecipientId === recipient.id
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                    {recipient.id === SELF_RECIPIENT_ID ? 'Saya' : idx}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{recipient.id === SELF_RECIPIENT_ID ? 'Saya' : recipient.name}</p>
                    <p className="text-[10px] text-slate-500">{recipient.email}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2">
                  {(() => {
                    const recipientFieldCount = fields.filter((field) => field.recipientId === recipient.id).length
                    return recipientFieldCount > 0 ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {recipientFieldCount} field ditempatkan
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
                      setSelectedRecipientId(recipient.id)
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {activeRecipient?.id === recipient.id ? 'Mencari Posisi...' : 'Tempatkan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Panel Tengah: Pratinjau Dokumen PDF */}
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

                {visibleFields.filter((field) => field.pageNumber === page.pageNumber).map((field) => {
              const isSelected = selectedFieldId === field.id
              return (
                <div
                  key={field.id}
                  ref={(element) => {
                    fieldElementsRef.current[field.id] = element
                  }}
                  onPointerDown={(event) => {
                    if (pdfInteractive || activeRecipient) return
                    event.preventDefault()
                    setSelectedFieldId(field.id)
                    const interaction = {
                      mode: 'drag',
                      fieldId: field.id,
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
                    } satisfies FieldInteraction
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
                  className={`absolute z-10 rounded-lg border-2 border-dashed p-2 transition-[border-color,box-shadow] flex flex-col items-center justify-center bg-blue-50/80 ${
                    isSelected ? 'border-blue-600 ring-2 ring-blue-400' : 'border-blue-400'
                  }`}
                >
                  <div className="absolute -top-3 left-2 bg-[#1e4273] text-white text-[9px] font-bold px-2 py-0.5 rounded">
                    {field.recipientName}
                  </div>
                  <button
                    type="button"
                    aria-label="Batalkan field tanda tangan"
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleDeleteField(field.id)
                    }}
                    className="absolute -right-3 -top-3 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <PenTool className="w-4 h-4 text-blue-600 mb-1" />
                  <span className="text-[10px] font-semibold text-blue-800">
                    {field.type === 'SIGNATURE' ? 'Tanda tangan di sini' : 'Paraf di sini'}
                  </span>
                  {isSelected && !pdfInteractive && (
                    <button
                      type="button"
                      aria-label="Ubah ukuran field tanda tangan"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        const interaction = {
                          mode: 'resize',
                          fieldId: field.id,
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
                        } satisfies FieldInteraction
                        interactionRef.current = interaction
                      }}
                      className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-tl bg-blue-600"
                    />
                  )}
                </div>
              )
                })}
              </div>
            ))}
          </div>
        </main>

        {/* Panel Kanan: Properti Tanda Tangan */}
        <aside className="w-64 border-l bg-white p-4 space-y-6">
          <h3 className="text-xs font-bold text-slate-800 border-b pb-2">Properti Tanda Tangan</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-2">Lokasi Tanda Tangan</label>
              <select
                value={selectedRecipientId ?? ''}
                onChange={(event) => {
                  const recipientId = event.target.value || null
                  setSelectedRecipientId(recipientId)
                  setSelectedFieldId(null)
                }}
                className="mb-3 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700"
              >
                <option value="">Semua penandatangan</option>
                {selfRecipient && <option value={SELF_RECIPIENT_ID}>Saya</option>}
                {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name}</option>)}
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
                      className={`w-full rounded-lg border p-2 text-left text-[11px] ${selectedFieldId === field.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <span className="block font-semibold text-slate-700">{index + 1}. {field.recipientName}</span>
                      <span className="block text-slate-500">Halaman {field.pageNumber} · X: {Math.round(field.posX)} · Y: {Math.round(field.posY)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada field tanda tangan.</p>
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
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700"
                />
              </div>

            </div>
          ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}