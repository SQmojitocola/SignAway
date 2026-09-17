'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const images = [
  '/assets/bg1.jpg',
  '/assets/bg2.jpg',
  '/assets/bg3.jpg',
  '/assets/bg4.jpg',
  '/assets/bg5.jpg',
  '/assets/bg6.jpg'
]

export default function BackgroundSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 5000) // Berganti setiap 5 detik

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-900">
      {images.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100 scale-105 transition-all duration-10000' : 'opacity-0 scale-100'
          }`}
        >
          <Image
            src={src}
            alt="Background Slide"
            fill
            priority={index === 0}
            className="object-cover"
          />
        </div>
      ))}
      {/* Overlay Gelap dengan Blur Tipis agar Form Kontras dan Elegan */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
    </div>
  )
}