'use client'

import { useState } from 'react'
import { X, PenTool, FileCheck, Check } from 'lucide-react'

interface FieldTypeSelectorModalProps {
  isOpen: boolean
  recipientName?: string
  onClose: () => void
  onConfirm: (type: 'SIGNATURE' | 'PARAF') => void
}

export function FieldTypeSelectorModal({
  isOpen,
  recipientName,
  onClose,
  onConfirm,
}: FieldTypeSelectorModalProps) {
  const [selectedType, setSelectedType] = useState<'SIGNATURE' | 'PARAF'>('SIGNATURE')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plotting Baru</p>
            <h3 className="text-base font-extrabold text-slate-800">Pilih Tipe Element</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Tentukan tipe komponen yang ingin ditempatkan untuk{' '}
          <span className="font-bold text-slate-700">{recipientName || 'Penandatangan'}</span>:
        </p>

        {/* Pilihan Card TTD / Paraf */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedType('SIGNATURE')}
            className={`flex flex-col items-center justify-center rounded-xl p-4 border-2 transition-all ${
              selectedType === 'SIGNATURE'
                ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            <PenTool className="h-6 w-6 mb-2 text-blue-600" />
            <span className="text-xs font-bold">Tanda Tangan</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Ukuran Standar</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('PARAF')}
            className={`flex flex-col items-center justify-center rounded-xl p-4 border-2 transition-all ${
              selectedType === 'PARAF'
                ? 'border-amber-500 bg-amber-50/70 text-amber-700 shadow-sm ring-2 ring-amber-500/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            <FileCheck className="h-6 w-6 mb-2 text-amber-600" />
            <span className="text-xs font-bold">Paraf</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Ukuran Ringkas</span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedType)}
            className="flex items-center gap-1.5 rounded-xl bg-[#1e4273] px-5 py-2 text-xs font-bold text-white hover:bg-blue-900 shadow-sm"
          >
            <Check className="h-4 w-4" /> Tempatkan
          </button>
        </div>
      </div>
    </div>
  )
}