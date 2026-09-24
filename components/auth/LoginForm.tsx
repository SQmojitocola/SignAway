'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(false)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Email atau password salah.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-800">
      {/* 📍 PANEL KIRI: FORM LOGIN */}
      <div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
        {/* Header Logo */}
        <div className="flex items-center justify-between">
          <div className="relative h-12 w-48 sm:w-56">
            <Image
              src="/assets/logo-surveyor-indonesia-png-svg-removebg-preview.png"
              alt="Logo Surveyor Indonesia"
              fill
              className="object-contain object-left"
              priority
            />
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs font-bold text-slate-400">
            <span>Danantara Indonesia</span>
            <span>•</span>
            <span>ID Survey</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="mx-auto w-full max-w-md my-auto py-8">
          <h1 className="text-3xl font-extrabold text-[#003b73] tracking-tight">
            Selamat Datang
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
            Platform terpadu untuk Pengesahan Tanda Tangan Digital & Manajemen Dokumen yang modern dan efisien.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Input Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="Masukkan email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/70 pl-10 pr-4 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-[#003b73] focus:bg-white focus:ring-1 focus:ring-[#003b73]"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/70 pl-10 pr-10 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-[#003b73] focus:bg-white focus:ring-1 focus:ring-[#003b73]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Lupa Password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => alert('Silakan hubungi Administrator untuk mereset password Anda.')}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Lupa Password?
              </button>
            </div>

            {/* Tombol Masuk */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#003b73] py-3 text-xs font-bold text-white transition-all hover:bg-blue-900 active:scale-[0.99] disabled:opacity-50 shadow-md"
            >
              {loading ? 'Memproses...' : 'Masuk'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Pengganti Tombol Register */}
          <p className="mt-8 text-center text-xs text-slate-400">
            Belum memiliki akun?{' '}
            <span className="font-semibold text-slate-600">Hubungi Administrator</span>
          </p>
        </div>

        {/* Footer Copyright */}
        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
          © 2026 PT SURVEYOR INDONESIA. ALL RIGHTS RESERVED
        </div>
      </div>

      {/* 📍 PANEL KANAN: BANNER VISUAL PERKANTORAN */}
      <div className="hidden lg:flex lg:w-1/2 p-6">
        <div
          className="relative flex h-full w-full flex-col justify-end overflow-hidden rounded-3xl p-12 text-white shadow-2xl"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(0, 31, 63, 0.92), rgba(0, 59, 115, 0.45)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="relative z-10 max-w-lg space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Layanan Umum Digital
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed opacity-90">
              Digitalisasi layanan umum dan pengesahan dokumen untuk produktivitas kerja maksimal.
            </p>

            {/* Indikator Dots Slider */}
            <div className="pt-4 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white"></span>
              <span className="h-2 w-2 rounded-full bg-white/40"></span>
              <span className="h-2 w-2 rounded-full bg-white/40"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}