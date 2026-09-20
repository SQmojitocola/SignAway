'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import BackgroundSlider from '@/components/auth/BackgroundSlider'

export default function LoginForm() {
  const router = useRouter()
  const [role, setRole] = useState('Karyawan')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Email atau password salah')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      {/* Background Transisi Carousel */}
      <BackgroundSlider />

      {/* Card Form Login */}
      <div className="w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-md p-6 shadow-2xl border border-white/20 text-center relative z-10">
        <div className="mb-6 flex flex-col items-center">
          <div className="relative h-16 w-56">
            <Image
              src="/assets/logo-surveyor-indonesia-png-svg-removebg-preview.png"
              alt="Logo Surveyor Indonesia"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="mt-2 text-xl font-extrabold text-blue-900">E-Sign</h1>
          <p className="text-xs font-medium text-slate-500">Document Approval Management</p>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-blue-900 bg-white"
            >
              <option value="Admin">Admin</option>
              <option value="Karyawan">Karyawan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="nama@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-blue-900 bg-white/80"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-blue-900 bg-white/80"
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300" />
              Ingat saya
            </label>
            <a href="#" className="text-blue-900 font-semibold hover:underline">Lupa password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-900 py-2.5 text-xs font-semibold text-white hover:bg-blue-950 transition-colors shadow-md"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>

          <Link
            href="/register"
            className="block w-full text-center rounded-lg border border-blue-900 py-2.5 text-xs font-semibold text-blue-900 hover:bg-blue-50 transition-colors"
          >
            Daftar
          </Link>
        </form>

        <p className="mt-6 text-[10px] text-slate-400">© 2026 PT Surveyor Indonesia</p>
      </div>
    </div>
  )
}