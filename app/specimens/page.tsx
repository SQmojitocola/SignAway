'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Star, Trash2, Plus, PenTool, FileCheck, X, Eraser, Check } from 'lucide-react'

interface UserSpecimen {
  id: string
  type: 'SIGNATURE' | 'PARAF'
  imageUrl: string
  isPrimary: boolean
  createdAt: string
}

export default function SpecimensPage() {
  const [activeTab, setActiveTab] = useState<'SIGNATURE' | 'PARAF'>('SIGNATURE')
  const [specimens, setSpecimens] = useState<UserSpecimen[]>([])
  const [loading, setLoading] = useState(true)

  // State Modal Tambah Spesimen
  const [showModal, setShowModal] = useState(false)
  const [setAsPrimaryInput, setSetAsPrimaryInput] = useState(true)
  const [saving, setSaving] = useState(false)

  // Canvas Pad Ref & Drawing States
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)

  const fetchSpecimens = async () => {
    try {
      const res = await fetch('/api/specimens')
      const data = await res.json()
      if (res.ok && data.specimens) {
        setSpecimens(data.specimens)
      }
    } catch (err) {
      console.error('Fetch specimens error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSpecimens()
  }, [])

  // 📍 Handler Goresan Canvas Modal (Mouse & Touch)
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
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
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasDrawing(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setHasDrawing(false)
  }

  // 📍 Handler Simpan Spesimen Baru via API POST
  const handleSaveSpecimen = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawing) {
      alert('Silakan goreskan tanda tangan / paraf terlebih dahulu.')
      return
    }

    setSaving(true)
    try {
      const imageUrl = canvas.toDataURL('image/png')

      const res = await fetch('/api/specimens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          imageUrl,
          setAsPrimary: setAsPrimaryInput,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setShowModal(false)
        clearCanvas()
        void fetchSpecimens()
      } else {
        alert(data.message || 'Gagal menyimpan spesimen baru.')
      }
    } catch (err) {
      console.error('Save specimen error:', err)
      alert('Terjadi kesalahan koneksi server.')
    } finally {
      setSaving(false)
    }
  }

  // Handler Set Utama via PATCH
  const handleSetPrimary = async (id: string, type: string) => {
    try {
      const res = await fetch('/api/specimens', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type }),
      })

      if (res.ok) {
        setSpecimens((prev) =>
          prev.map((item) => {
            if (item.type !== type) return item
            return {
              ...item,
              isPrimary: item.id === id,
            }
          })
        )
      } else {
        alert('Gagal mengubah spesimen utama')
      }
    } catch (err) {
      console.error('Set primary error:', err)
    }
  }

  // Handler Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus spesimen ini?')) return

    try {
      const res = await fetch(`/api/specimens?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSpecimens((prev) => prev.filter((item) => item.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const filteredSpecimens = specimens.filter((item) => item.type === activeTab)
  const signatureCount = specimens.filter((s) => s.type === 'SIGNATURE').length
  const parafCount = specimens.filter((s) => s.type === 'PARAF').length

  return (
    <div className="min-h-screen w-full bg-slate-100/80 p-8 space-y-6">
      {/* Header Page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pustaka Pengesahan</p>
          <h1 className="text-2xl font-extrabold text-slate-800">Atribut Pengesahan</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola spesimen tanda tangan digital dan paraf resmi Anda.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Filter */}
          <div className="flex items-center rounded-xl bg-slate-200/70 p-1 border border-slate-300/60">
            <button
              type="button"
              onClick={() => setActiveTab('SIGNATURE')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'SIGNATURE'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="h-3.5 w-3.5" /> Tanda Tangan
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
                {signatureCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PARAF')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'PARAF'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" /> Paraf
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                {parafCount}
              </span>
            </button>
          </div>

          {/* 📍 TOMBOL TAMBAH SPESIMEN (SEKARANG SUDAH BERFUNGSI MENGAKTIFKAN MODAL) */}
          <button
            type="button"
            onClick={() => {
              clearCanvas()
              setShowModal(true)
            }}
            className="flex items-center gap-2 rounded-xl bg-[#1e4273] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Tambah {activeTab === 'SIGNATURE' ? 'Tanda Tangan' : 'Paraf'}
          </button>
        </div>
      </div>

      {/* Grid Spesimen Card */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Memuat spesimen pengesahan...</div>
      ) : filteredSpecimens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
          Belum ada {activeTab === 'SIGNATURE' ? 'tanda tangan' : 'paraf'} tersimpan.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredSpecimens.map((item) => (
            <div
              key={item.id}
              className={`group relative flex flex-col justify-between rounded-2xl border transition-all p-4 bg-white ${
                item.isPrimary
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200/90 hover:border-slate-300 shadow-sm'
              }`}
            >
              {/* Badge Utama / Tombol Set Utama */}
              <div className="flex items-center justify-between min-h-[28px] mb-2">
                {item.isPrimary ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 border border-blue-200">
                    <Star className="h-3 w-3 fill-blue-600" /> Utama
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(item.id, item.type)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-2.5 py-1 text-[10px] font-semibold text-slate-500 border border-slate-200"
                  >
                    <Star className="h-3 w-3" /> Jadikan Utama
                  </button>
                )}
              </div>

              {/* Box Preview Gambar Spesimen */}
              <div className="relative h-32 w-full rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 p-2 overflow-hidden">
                <Image
                  src={item.imageUrl}
                  alt="Spesimen TTD"
                  fill
                  sizes="(min-width: 1024px) 20rem, 100vw"
                  className="object-contain p-2"
                />
              </div>

              {/* Footer Card */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                <span>
                  {new Date(item.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
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

      {/* 📍 MODAL POP-UP BUAT SPESIMEN BARU */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Buat Spesimen {activeTab === 'SIGNATURE' ? 'Tanda Tangan' : 'Paraf'}
                </h3>
                <p className="text-xs text-slate-400">Goreskan pada kotak di bawah</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Area Canvas Menggores */}
            <div className="relative h-44 w-full rounded-xl border-2 border-slate-300 bg-slate-50 overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={400}
                height={176}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={setAsPrimaryInput}
                  onChange={(e) => setSetAsPrimaryInput(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Jadikan sebagai spesimen utama</span>
              </label>

              <button
                type="button"
                onClick={clearCanvas}
                className="flex items-center gap-1 text-slate-400 hover:text-red-500 font-medium"
              >
                <Eraser className="h-3.5 w-3.5" /> Bersihkan
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!hasDrawing || saving}
                onClick={handleSaveSpecimen}
                className="flex items-center gap-2 rounded-xl bg-[#1e4273] px-5 py-2 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50 shadow-sm"
              >
                <Check className="h-4 w-4" />
                {saving ? 'Menyimpan...' : 'Simpan Spesimen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}