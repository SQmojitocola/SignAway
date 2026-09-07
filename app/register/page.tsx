'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    nip: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreed: false
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Handlers untuk Canvas TTD Sederhana
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok')
      return
    }
    if (!form.agreed) {
      setError('Anda harus menyetujui pernyataan keabsahan spesimen')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Ambil Base64 spesimen TTD dari Canvas
      const signatureSpecimen = canvasRef.current?.toDataURL('image/png')

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          nip: form.nip,
          signatureSpecimen
        }),
      })

      if (!res.ok) throw new Error('Gagal mendaftar')
      router.push('/login?registered=true')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 py-10 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
        <div className="text-center mb-6">
          <Image
            src="/assets/logo-surveyor-indonesia-png-svg.png"
            alt="Logo Surveyor Indonesia"
            width={200}
            height={110}
            className="mx-auto mb-2 h-auto w-48 object-contain"
            priority
          />
          <h1 className="text-2xl font-bold text-blue-900">Daftar Akun Baru</h1>
          <p className="text-xs font-semibold tracking-wider text-blue-600 uppercase">Surveyorsign • Corporate Document Management</p>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso, S.T."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-800"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NIP / ID Karyawan</label>
              <input
                type="text"
                required
                placeholder="PTS-2024-XXXX"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-800"
                onChange={(e) => setForm({ ...form, nip: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Kedinasan</label>
            <input
              type="email"
              required
              placeholder="nama.pegawai@surveyor.id"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-800"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi</label>
              <input
                type="password"
                required
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-800"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi</label>
              <input
                type="password"
                required
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-800"
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          {/* Canvas Spesimen TTD */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">Spesimen Tanda Tangan Digital</label>
              <button type="button" onClick={clearCanvas} className="text-xs text-red-500 hover:underline">Bersihkan / Ulangi</button>
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-2 bg-slate-50 text-center">
              <canvas
                ref={canvasRef}
                width={480}
                height={120}
                className="w-full bg-white rounded-lg cursor-crosshair border border-slate-200"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={() => setIsDrawing(false)}
              />
              <p className="text-[10px] text-slate-400 mt-1">Goreskan tanda tangan resmi Anda di atas canvas</p>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="agreed"
              className="mt-1 rounded border-slate-300"
              onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
            />
            <label htmlFor="agreed" className="text-[11px] text-slate-600">
              Saya menyatakan bahwa spesimen tanda tangan dan data di atas adalah benar dan sah pada sistem SurveyorSign.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Daftar & Aktivasi Akun →'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-600">
          Sudah memiliki akun? <Link href="/login" className="font-semibold text-blue-900 hover:underline">Masuk di sini</Link>
        </p>
      </div>
    </div>
  )
}