'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// Data Slide Asli
const baseSlides = [
  {
    image: '/assets/bg1.jpeg',
    title: 'Keabsahan Dokumen Digital',
    description:
      'Digitalisasi layanan pengesahan dokumen dan persetujuan resmi untuk tingkatkan efisiensi alur kerja.',
    credit: 'PT Surveyor Indonesia',
  },
  {
    image: '/assets/bg7.jpg',
    title: 'Ruang Kerja Modern & Terintegrasi',
    description:
      'Pengelolaan alur penandatanganan dokumen dari mana saja, kapan saja dengan keamanan kriptografi tingkat tinggi.',
    credit: 'Photo by Nataliya Vaitkevich (Pexels)',
    creditLink:
      'https://www.pexels.com/photo/overhead-shot-of-a-workspace-8927455/',
  },
  {
    image: '/assets/bg6.jpeg',
    title: 'Transformasi Layanan Umum',
    description:
      'Solusi modern terpadu bagi produktivitas, integritas data, dan efisiensi manajemen berkas perusahaan.',
    credit: 'PT Surveyor Indonesia',
  },
]

// Array Infinite Loop (Clone di Awal & Akhir)
const slides = [
  baseSlides[baseSlides.length - 1],
  ...baseSlides,
  baseSlides[0],
]

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // State Carousel
  const [currentIndex, setCurrentIndex] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)

  const autoSlideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sliderRef = useRef<HTMLDivElement | null>(null)

  const handleNextSlide = useCallback(() => {
    setIsTransitioning(true)
    setCurrentIndex((prev) => prev + 1)
  }, [])

  const handlePrevSlide = useCallback(() => {
    setIsTransitioning(true)
    setCurrentIndex((prev) => prev - 1)
  }, [])

  // Handle Loop Instant (Seamless Transition Jump)
  const handleTransitionEnd = () => {
    if (currentIndex === slides.length - 1) {
      setIsTransitioning(false)
      setCurrentIndex(1)
    } else if (currentIndex === 0) {
      setIsTransitioning(false)
      setCurrentIndex(slides.length - 2)
    }
  }

  // Auto-Slide 5 Detik
  const startAutoSlide = useCallback(() => {
    if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current)
    autoSlideTimerRef.current = setInterval(() => {
      handleNextSlide()
    }, 5000)
  }, [handleNextSlide])

  useEffect(() => {
    startAutoSlide()
    return () => {
      if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current)
    }
  }, [startAutoSlide])

  const resetAutoSlide = () => {
    startAutoSlide()
  }

  // Drag Gesture Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Abaikan drag jika mengklik tombol kontrol
    if ((e.target as HTMLElement).closest('button')) return

    setIsDragging(true)
    setStartX(e.clientX)
    setDragOffset(0)

    if (sliderRef.current) {
      sliderRef.current.setPointerCapture(e.pointerId)
    }

    if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const currentX = e.clientX
    const diff = currentX - startX
    setDragOffset(diff)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return

    if (sliderRef.current && sliderRef.current.hasPointerCapture(e.pointerId)) {
      sliderRef.current.releasePointerCapture(e.pointerId)
    }

    setIsDragging(false)

    if (dragOffset < -50) {
      handleNextSlide()
    } else if (dragOffset > 50) {
      handlePrevSlide()
    }

    setDragOffset(0)
    resetAutoSlide()
  }

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
      setError('Email atau password salah.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const activeDotIndex =
    currentIndex === 0
      ? baseSlides.length - 1
      : currentIndex === slides.length - 1
      ? 0
      : currentIndex - 1

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* 📍 PANEL KIRI: FORM LOGIN */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-6 w-full">
          {/* Logo E-Sign (Kiri) */}
          <div className="flex items-center select-none shrink-0 min-w-[220px] pr-8 overflow-visible py-2">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 bg-clip-text text-transparent drop-shadow-xs">
              E-
            </span>
            <span
              style={{ fontFamily: 'var(--font-dancing-script), cursive, sans-serif' }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-teal-400 to-blue-600 bg-clip-text text-transparent italic -ml-1 pr-4 leading-normal"
            >
              Sign
            </span>
          </div>

          {/* Logo PT Surveyor Indonesia (Kanan) */}
          <div className="relative h-14 w-48 sm:w-60 shrink-0">
            <Image
              src="/assets/logo-surveyor-indonesia-png-svg-removebg-preview.png"
              alt="Logo Surveyor Indonesia"
              fill
              sizes="(min-width: 1024px) 15rem, 12rem"
              className="object-contain object-right"
              priority
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="mx-auto w-full max-w-md my-auto py-6">
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

          {/* Info Administrator */}
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

      {/* 📍 PANEL KANAN: INFINITE LOOPING IMAGE SLIDER */}
      <div className="hidden lg:flex lg:w-1/2 p-6">
        <div
          ref={sliderRef}
          style={{ touchAction: 'none' }}
          className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl select-none cursor-grab active:cursor-grabbing group"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Track Slides */}
          <div
            className={`flex h-full w-full ${
              isTransitioning && !isDragging
                ? 'transition-transform duration-700 ease-out'
                : 'transition-none'
            }`}
            style={{
              transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {slides.map((slide, idx) => (
              <div key={idx} className="relative h-full w-full shrink-0">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  sizes="(min-width: 1024px) 50vw, 0px"
                  className="object-cover pointer-events-none"
                  priority={idx === 1}
                  loading={idx === 1 ? 'eager' : 'lazy'}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001f3f]/95 via-[#003b73]/40 to-transparent pointer-events-none" />

                <div className="absolute inset-0 flex flex-col justify-end p-12 text-white pointer-events-none">
                  <div className="max-w-lg space-y-3 z-10">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight drop-shadow-md">
                      {slide.title}
                    </h2>
                    <p className="text-xs text-slate-200 leading-relaxed opacity-90 drop-shadow-xs">
                      {slide.description}
                    </p>

                    <p className="text-[10px] text-slate-300/80 pt-1 italic">
                      cr:{' '}
                      {slide.creditLink ? (
                        <a
                          href={slide.creditLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-white pointer-events-auto"
                        >
                          {slide.credit}
                        </a>
                      ) : (
                        <span>{slide.credit}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 📍 TOMBOL PANAH NAVIGASI (DIBERI z-30 DAN STOP PROPAGATION) */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              handlePrevSlide()
              resetAutoSlide()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/50 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-900/80 z-30 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              handleNextSlide()
              resetAutoSlide()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/50 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-900/80 z-30 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* 📍 INDIKATOR DOTS NAVIGASI (DIBERI z-30 DAN STOP PROPAGATION) */}
          <div className="absolute bottom-6 left-12 flex items-center gap-2 z-30">
            {baseSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsTransitioning(true)
                  setCurrentIndex(idx + 1)
                  resetAutoSlide()
                }}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeDotIndex === idx
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}