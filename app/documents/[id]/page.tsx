'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Eraser, Send, ShieldAlert, PenTool } from 'lucide-react'

interface Field {
  id: string
  recipientId: string
  pageNumber: number
  posX: number
  posY: number
  width: number
  height: number
  status?: string
}

const PDF_VIEWPORT_SCALE = 1.25

export default function SignDocumentPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [documentTitle, setDocumentTitle] = useState('Memuat dokumen...')
  const [documentPath, setDocumentPath] = useState<string | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [activeField, setActiveField] = useState<Field | null>(null)

  // State PDF.js Pages
  const [pdfPages, setPdfPages] = useState<Array<{ pageNumber: number; width: number; height: number }>>([])
  const pageCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})

  // State Canvas TTD Pad
  const padCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [bgCropUrl, setBgCropUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 1. Load Data Dokumen & Field Milik User Logged In
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Gagal memuat dokumen')

        setDocumentTitle(data.document.title)
        setDocumentPath(data.document.filePath)

        // Ambil field milik user aktif
        const fieldsRes = await fetch(`/api/documents/fields?documentId=${documentId}`)
        const fieldsData = await fieldsRes.json()
        if (fieldsRes.ok && fieldsData.fields) {
          setFields(fieldsData.fields)
          if (fieldsData.fields.length > 0) {
            setActiveField(fieldsData.fields[0])
          }
        }
      } catch (err) {
        console.error('Load sign page error:', err)
      }
    }

    if (documentId) loadData()
  }, [documentId])

  // 2. Render PDF Pages via PDF.js
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

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: PDF_VIEWPORT_SCALE })
        pages.push({ pageNumber: i, width: viewport.width, height: viewport.height })
      }

      if (!cancelled) setPdfPages(pages)
    }

    renderPdf()
    return () => {
      cancelled = true
    }
  }, [documentPath])

  // Render Canvas Per Halaman
  useEffect(() => {
    if (!documentPath || pdfPages.length === 0) return

    let cancelled = false
    const renderCanvases = async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()

      const pdf = await pdfjs.getDocument(documentPath).promise

      await Promise.all(
        pdfPages.map(async ({ pageNumber, width, height }) => {
          const page = await pdf.getPage(pageNumber)
          const canvas = pageCanvasRefs.current[pageNumber]
          if (!canvas || cancelled) return

          const context = canvas.getContext('2d')
          if (!context) return

          canvas.width = width
          canvas.height = height
          await page.render({
            canvasContext: context,
            viewport: page.getViewport({ scale: PDF_VIEWPORT_SCALE }),
          }).promise
        })
      )

      // Set mirror background untuk activeField pertama kali
      if (activeField && !cancelled) {
        captureMirrorBackground(activeField)
      }
    }

    renderCanvases()
    return () => {
      cancelled = true
    }
  }, [documentPath, pdfPages])

  // 📍 3. FUNGSI CROP / MIRRORING BACKGROUND DARI CANVAS PDF
  const captureMirrorBackground = (field: Field) => {
    const pdfCanvas = pageCanvasRefs.current[field.pageNumber]
    if (!pdfCanvas) return

    try {
      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = field.width
      cropCanvas.height = field.height
      const ctx = cropCanvas.getContext('2d')

      if (ctx) {
        ctx.drawImage(
          pdfCanvas,
          field.posX,
          field.posY,
          field.width,
          field.height,
          0,
          0,
          field.width,
          field.height
        )
        setBgCropUrl(cropCanvas.toDataURL('image/png'))
      }
    } catch (e) {
      console.error('Mirror background error:', e)
    }
  }

  // Effect saat activeField berpindah
  useEffect(() => {
    if (activeField) {
      captureMirrorBackground(activeField)
      clearSignaturePad()
    }
  }, [activeField])

  // 📍 4. HANDLER GORESAN PAD TTD (MOUSE & TOUCH)
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = padCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = padCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignaturePad = () => {
    const canvas = padCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setHasSignature(false)
  }

  // 📍 5. SUBMIT HANDLER PENANDATANGANAN
  const handleSignSubmit = async () => {
    const padCanvas = padCanvasRef.current
    if (!padCanvas || !hasSignature || !activeField) {
      alert('Silakan goreskan tanda tangan Anda terlebih dahulu.')
      return
    }

    setSubmitting(true)
    try {
      // Export Goresan TTD sebagai PNG Transparan
      const signatureData = padCanvas.toDataURL('image/png')

      const res = await fetch('/api/documents/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          signatureImageBase64: signatureData,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert('Tanda tangan berhasil ditempelkan pada dokumen!')
        router.push('/dashboard')
      } else {
        alert(data.message || 'Gagal memproses tanda tangan.')
      }
    } catch (err) {
      console.error('Submit Sign Error:', err)
      alert('Terjadi kesalahan koneksi server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-100">
      {/* Header Bar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{documentTitle}</h1>
            <p className="text-[11px] text-slate-400">Proses Penandatanganan Dokumen Digital</p>
          </div>
        </div>

        <button
          type="button"
          disabled={!hasSignature || submitting}
          onClick={handleSignSubmit}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-950/50"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Memproses...' : 'Kirim Tanda Tangan'}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel Kiri: Canvas Viewer PDF */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-8 flex justify-center">
          <div className="flex flex-col gap-6">
            {pdfPages.map((page) => (
              <div
                key={page.pageNumber}
                className="relative bg-white shadow-2xl rounded-sm overflow-hidden"
                style={{ width: page.width, height: page.height }}
              >
                <canvas
                  ref={(el) => {
                    pageCanvasRefs.current[page.pageNumber] = el
                  }}
                  className="block"
                />

                {/* Plotting Kotak Field TTD Milik User */}
                {fields
                  .filter((f) => f.pageNumber === page.pageNumber)
                  .map((field) => {
                    const isActive = activeField?.id === field.id
                    return (
                      <div
                        key={field.id}
                        onClick={() => setActiveField(field)}
                        style={{
                          left: `${field.posX}px`,
                          top: `${field.posY}px`,
                          width: `${field.width}px`,
                          height: `${field.height}px`,
                        }}
                        className={`absolute z-10 cursor-pointer rounded-lg border-2 p-2 flex flex-col items-center justify-center transition-all ${
                          isActive
                            ? 'border-blue-500 bg-blue-50/80 ring-4 ring-blue-500/30 shadow-lg'
                            : 'border-amber-500 bg-amber-50/70 hover:bg-amber-100/80'
                        }`}
                      >
                        <PenTool className={`h-4 w-4 mb-1 ${isActive ? 'text-blue-600' : 'text-amber-600'}`} />
                        <span
                          className={`text-[10px] font-bold ${
                            isActive ? 'text-blue-800' : 'text-amber-800'
                          }`}
                        >
                          {isActive ? 'Aktif Menggores' : 'Klik untuk TTD'}
                        </span>
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </main>

        {/* Panel Kanan: Papan Tanda Tangan Dengan Mirroring Context Background */}
        <aside className="w-80 border-l border-slate-800 bg-slate-950 p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              Papan Tanda Tangan
            </h2>

            <p className="text-xs text-slate-300">
              Goreskan tanda tangan Anda pada kotak di bawah. Latar belakang memperlihatkan posisi area dokumen asli[cite: 10]:
            </p>

            {/* 📍 KOTAK CANVAS PAD GORES DENGAN BACKGROUND MIRRORING CROP PDF */}
            <div
              className="relative w-full h-48 rounded-2xl border-2 border-slate-700 bg-white overflow-hidden shadow-inner"
              style={{
                backgroundImage: bgCropUrl ? `url(${bgCropUrl})` : 'none',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Overlay Transparan agar tulisan PDF redup */}
              {bgCropUrl && <div className="absolute inset-0 bg-white/65 pointer-events-none" />}

              {/* Canvas Tempat Menggores */}
              <canvas
                ref={padCanvasRef}
                width={280}
                height={192}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 z-10 w-full h-full cursor-crosshair touch-none"
              />
            </div>

            <button
              type="button"
              onClick={clearSignaturePad}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors"
            >
              <Eraser className="h-3.5 w-3.5" /> Bersihkan Papan
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <ShieldAlert className="h-4 w-4 text-emerald-400" /> Keamanan SHA-256
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Setiap goresan akan dikunci secara kriptografi dan dilengkapi stempel footer verifikasi digital otomatis.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}