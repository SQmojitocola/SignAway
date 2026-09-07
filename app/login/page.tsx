'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
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
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 pt-2 shadow-lg border border-slate-200 text-center">
        <div className="mb-4 flex flex-col items-center">
          <Image
            src="/assets/logo-surveyor-indonesia-png-svg.png"
            alt="Logo Surveyor Indonesia"
            width={180}
            height={100}
            className="h-auto w-44 object-contain"
            priority
          />
          <h1 className="text-xl font-bold text-blue-900">e-Sign</h1>
          <p className="text-xs text-slate-500">Platform Tanda Tangan Digital</p>
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
              placeholder="nama@ptsi.co.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-blue-900"
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
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-blue-900"
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
            className="w-full rounded-lg bg-blue-900 py-2.5 text-xs font-semibold text-white hover:bg-blue-950 transition-colors"
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

        <p className="mt-8 text-[10px] text-slate-400">© 2026 PT Surveyor Indonesia</p>
      </div>
    </div>
  )
}