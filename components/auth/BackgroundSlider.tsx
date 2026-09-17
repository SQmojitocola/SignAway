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
    }, 6000) // Berganti setiap 6 detik

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-950">
      {images.map((src, index) => {
        const isActive = index === currentIndex

        return (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className={`h-full w-full transition-transform duration-[7000ms] ease-out ${
                isActive ? 'scale-110' : 'scale-100'
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
          </div>
        )
      })}

      {/* Overlay Gelap & Blur Tipis agar Form Kontras dan Elegan */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
    </div>
  )
}