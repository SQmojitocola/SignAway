'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { PenTool, CheckCircle2, Plus, Trash2, X, Star } from 'lucide-react'

interface Specimen {
  id: string
  type: 'SIGNATURE' | 'INITIAL'
  imageUrl: string
  isPrimary: boolean
  createdAt: string
}

export default function SpecimensTabClient() {
  const [activeTab, setActiveTab] = useState<'SIGNATURE' | 'INITIAL'>('SIGNATURE')
  const [specimens, setSpecimens] = useState<Specimen[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPrimary, setIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const fetchSpecimens = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/specimens')
      const data = await res.json()
      if (res.ok) setSpecimens(data.specimens || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSpecimens()
  }, [])

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    ctx.stroke()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleSaveSpecimen = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const imageUrl = canvas.toDataURL('image/png')

    setSaving(true)
    try {
      const res = await fetch('/api/specimens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          imageUrl,
          setAsPrimary: isPrimary,
        }),
      })

      if (res.ok) {
        setShowModal(false)
        clearCanvas()
        fetchSpecimens()
      } else {
        alert('Gagal menyimpan spesimen.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus spesimen ini?')) return
    try {
      const res = await fetch(`/api/specimens?id=${id}`, { method: 'DELETE' })
      if (res.ok) fetchSpecimens()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = specimens.filter((s) => s.type === activeTab)

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Pustaka Pengesahan</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Atribut Pengesahan</h1>
          <p className="text-sm font-normal text-slate-500 mt-1">Kelola spesimen tanda tangan digital dan paraf resmi Anda.</p>
        </div>

        {/* Tab & Button Tambah */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('SIGNATURE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'SIGNATURE'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <PenTool className="h-4 w-4 text-blue-600" />
              Tanda Tangan
              <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 font-extrabold">
                {specimens.filter((s) => s.type === 'SIGNATURE').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INITIAL')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'INITIAL'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
              Paraf
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700 font-extrabold">
                {specimens.filter((s) => s.type === 'INITIAL').length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#1e4273] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Tambah {activeTab === 'SIGNATURE' ? 'Tanda Tangan' : 'Paraf'}
          </button>
        </div>
      </div>

      {/* Grid Spesimen */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Memuat pustaka spesimen...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <PenTool className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-base font-bold text-slate-700">
            Belum ada spesimen {activeTab === 'SIGNATURE' ? 'Tanda Tangan' : 'Paraf'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Tambahkan spesimen agar bisa digunakan langsung saat menandatangani dokumen.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1e4273] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Tambahkan {activeTab === 'SIGNATURE' ? 'Tanda Tangan' : 'Paraf'} Pertama
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`relative rounded-2xl border bg-white p-4 shadow-sm transition-all flex flex-col justify-between ${
                item.isPrimary ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {item.isPrimary && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
                  <Star className="h-3 w-3 fill-blue-600 text-blue-600" /> Utama
                </span>
              )}

              <div className="my-6 flex h-32 w-full items-center justify-center rounded-xl bg-slate-50 border border-slate-100 p-2">
                <img src={item.imageUrl} alt="Spesimen" className="max-h-full max-w-full object-contain" />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Hapus Spesimen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Canvas Tambah Spesimen Baru */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Tambah {activeTab === 'SIGNATURE' ? 'Tanda Tangan' : 'Paraf'} Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Goreskan pada canvas di bawah</span>
                <button type="button" onClick={clearCanvas} className="text-red-500 font-semibold hover:underline">
                  Bersihkan
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-1">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full rounded-lg bg-white cursor-crosshair border border-slate-200"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={() => setIsDrawing(false)}
                />
              </div>
            </div>

            <div className="mb-5 flex items-center gap-2">
              <input
                type="checkbox"
                id="primaryCheck"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-slate-300"
              />
              <label htmlFor="primaryCheck" className="text-xs text-slate-600 cursor-pointer">
                Jadikan sebagai {activeTab === 'SIGNATURE' ? 'Tanda Tangan' : 'Paraf'} Utama
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSpecimen}
                className="rounded-xl bg-[#1e4273] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Spesimen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}