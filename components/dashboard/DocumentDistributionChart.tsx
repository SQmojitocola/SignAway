'use client'

import { useState } from 'react'

interface DocumentDistributionChartProps {
  totalDocs: number
  completedDocs: number
  inProgressDocs: number
  rejectedDocs: number
}

export default function DocumentDistributionChart({
  totalDocs,
  completedDocs,
  inProgressDocs,
  rejectedDocs,
}: DocumentDistributionChartProps) {
  const [hovered, setHovered] = useState<'completed' | 'inProgress' | 'rejected' | null>(null)

  const activeTotal = completedDocs + inProgressDocs + rejectedDocs || 1
  const completedPct = Number(((completedDocs / activeTotal) * 100).toFixed(1))
  const inProgressPct = Number(((inProgressDocs / activeTotal) * 100).toFixed(1))
  const rejectedPct = Number(((rejectedDocs / activeTotal) * 100).toFixed(1))

  const radius = 62
  const circumference = 2 * Math.PI * radius
  const baseStroke = 18
  const activeStroke = 24

  const strokeCompleted = (completedDocs / activeTotal) * circumference
  const strokeInProgress = (inProgressDocs / activeTotal) * circumference
  const strokeRejected = (rejectedDocs / activeTotal) * circumference

  const offsetCompleted = 0
  const offsetInProgress = -strokeCompleted
  const offsetRejected = -(strokeCompleted + strokeInProgress)

  const activeInfo = {
    completed: {
      label: 'Selesai',
      count: completedDocs,
      pct: completedPct,
      color: 'text-emerald-600',
    },
    inProgress: {
      label: 'Dalam Proses',
      count: inProgressDocs,
      pct: inProgressPct,
      color: 'text-amber-600',
    },
    rejected: {
      label: 'Ditolak',
      count: rejectedDocs,
      pct: rejectedPct,
      color: 'text-rose-600',
    },
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      {/* Header Tanpa Teks Berlebih */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Distribusi Status Dokumen
        </h2>
        {hovered ? (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
            hovered === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            hovered === 'inProgress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {activeInfo[hovered].label}: {activeInfo[hovered].pct}% ({activeInfo[hovered].count})
          </span>
        ) : (
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
            REAL-TIME
          </span>
        )}
      </div>

      {/* SVG Doughnut Visualisation dengan Interaksi Hover */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Latar Belakang Ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={baseStroke}
              fill="transparent"
            />

            {/* Segmen 1: Selesai (Emerald) */}
            {completedDocs > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#10b981"
                strokeWidth={hovered === 'completed' ? activeStroke : baseStroke}
                fill="transparent"
                strokeDasharray={`${strokeCompleted} ${circumference}`}
                strokeDashoffset={offsetCompleted}
                className="transition-all duration-300 ease-out cursor-pointer hover:opacity-90"
                onMouseEnter={() => setHovered('completed')}
                onMouseLeave={() => setHovered(null)}
              />
            )}

            {/* Segmen 2: Dalam Proses (Amber) */}
            {inProgressDocs > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#f59e0b"
                strokeWidth={hovered === 'inProgress' ? activeStroke : baseStroke}
                fill="transparent"
                strokeDasharray={`${strokeInProgress} ${circumference}`}
                strokeDashoffset={offsetInProgress}
                className="transition-all duration-300 ease-out cursor-pointer hover:opacity-90"
                onMouseEnter={() => setHovered('inProgress')}
                onMouseLeave={() => setHovered(null)}
              />
            )}

            {/* Segmen 3: Ditolak (Rose) */}
            {rejectedDocs > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#f43f5e"
                strokeWidth={hovered === 'rejected' ? activeStroke : baseStroke}
                fill="transparent"
                strokeDasharray={`${strokeRejected} ${circumference}`}
                strokeDashoffset={offsetRejected}
                className="transition-all duration-300 ease-out cursor-pointer hover:opacity-90"
                onMouseEnter={() => setHovered('rejected')}
                onMouseLeave={() => setHovered(null)}
              />
            )}
          </svg>

          {/* Teks di Tengah Donut Dinamis saat Hover */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all">
            {hovered ? (
              <>
                <span className={`text-2xl font-black ${activeInfo[hovered].color} leading-none`}>
                  {activeInfo[hovered].pct}%
                </span>
                <span className="text-[10px] font-bold text-slate-500 mt-1 max-w-[100px] truncate">
                  {activeInfo[hovered].label}
                </span>
              </>
            ) : (
              <>
                <span className="text-3xl font-black text-slate-900 leading-none">
                  {totalDocs}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  Dokumen
                </span>
              </>
            )}
          </div>
        </div>

        {/* Bar Proporsi Horisontal Interaktif */}
        <div className="w-full space-y-3">
          <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner cursor-pointer p-0.5">
            <div
              style={{ width: `${completedPct}%` }}
              className={`bg-emerald-500 h-full rounded-l-full transition-all duration-300 ${
                hovered === 'completed' ? 'opacity-100 scale-y-110 shadow-xs' : 'hover:opacity-90'
              }`}
              onMouseEnter={() => setHovered('completed')}
              onMouseLeave={() => setHovered(null)}
              title={`Selesai: ${completedDocs} (${completedPct}%)`}
            />
            <div
              style={{ width: `${inProgressPct}%` }}
              className={`bg-amber-500 h-full transition-all duration-300 ${
                hovered === 'inProgress' ? 'opacity-100 scale-y-110 shadow-xs' : 'hover:opacity-90'
              }`}
              onMouseEnter={() => setHovered('inProgress')}
              onMouseLeave={() => setHovered(null)}
              title={`Dalam Proses: ${inProgressDocs} (${inProgressPct}%)`}
            />
            <div
              style={{ width: `${rejectedPct}%` }}
              className={`bg-rose-500 h-full rounded-r-full transition-all duration-300 ${
                hovered === 'rejected' ? 'opacity-100 scale-y-110 shadow-xs' : 'hover:opacity-90'
              }`}
              onMouseEnter={() => setHovered('rejected')}
              onMouseLeave={() => setHovered(null)}
              title={`Ditolak: ${rejectedDocs} (${rejectedPct}%)`}
            />
          </div>
        </div>
      </div>

      {/* Rincian Legenda 3 Status dengan Efek Hover */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {/* 1. Selesai */}
        <div
          onMouseEnter={() => setHovered('completed')}
          onMouseLeave={() => setHovered(null)}
          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
            hovered === 'completed'
              ? 'bg-emerald-100/70 border-emerald-300 shadow-xs scale-[1.01]'
              : 'bg-emerald-50/50 border-emerald-100/60 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            <p className="text-xs font-bold text-slate-800">Selesai (Completed)</p>
          </div>
          <div className="text-right flex items-center gap-2">
            <span className="text-xs font-black text-slate-900">{completedDocs}</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
              {completedPct}%
            </span>
          </div>
        </div>

        {/* 2. Sedang Berjalan / Menunggu TTD */}
        <div
          onMouseEnter={() => setHovered('inProgress')}
          onMouseLeave={() => setHovered(null)}
          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
            hovered === 'inProgress'
              ? 'bg-amber-100/70 border-amber-300 shadow-xs scale-[1.01]'
              : 'bg-amber-50/50 border-amber-100/60 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
            <p className="text-xs font-bold text-slate-800">Menunggu TTD (In Progress)</p>
          </div>
          <div className="text-right flex items-center gap-2">
            <span className="text-xs font-black text-slate-900">{inProgressDocs}</span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
              {inProgressPct}%
            </span>
          </div>
        </div>

        {/* 3. Ditolak / Dibatalkan */}
        <div
          onMouseEnter={() => setHovered('rejected')}
          onMouseLeave={() => setHovered(null)}
          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
            hovered === 'rejected'
              ? 'bg-rose-100/70 border-rose-300 shadow-xs scale-[1.01]'
              : 'bg-rose-50/50 border-rose-100/60 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-200" />
            <p className="text-xs font-bold text-slate-800">Ditolak (Rejected)</p>
          </div>
          <div className="text-right flex items-center gap-2">
            <span className="text-xs font-black text-slate-900">{rejectedDocs}</span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
              {rejectedPct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
