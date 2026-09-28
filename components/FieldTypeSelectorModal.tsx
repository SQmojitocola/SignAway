'use client'

import { useState } from 'react'
import { X, PenTool, FileCheck, Check, QrCode, UserCheck } from 'lucide-react'

export type FieldPlotType = 'SIGNATURE' | 'PARAF' | 'AUDIT_STAMP' | 'NAME'

interface FieldTypeSelectorModalProps {
  isOpen: boolean
  recipientName?: string
  onClose: () => void
  onConfirm: (type: FieldPlotType) => void
}

export function FieldTypeSelectorModal({
  isOpen,
  recipientName,
  onClose,
  onConfirm,
}: FieldTypeSelectorModalProps) {
  const [selectedType, setSelectedType] = useState<FieldPlotType>('SIGNATURE')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plotting Dokumen</p>
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
          Tentukan tipe komponen yang ingin ditempatkan pada dokumen untuk {recipientName ? <span className="font-semibold text-slate-700">{recipientName}</span> : 'penandatangan'}:
        </p>

        {/* Pilihan Card TTD / Paraf / Nama & NIK / Stempel Audit */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedType('SIGNATURE')}
            className={`flex flex-col items-center justify-center rounded-xl p-3 border-2 transition-all cursor-pointer ${
              selectedType === 'SIGNATURE'
                ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            <PenTool className="h-5 w-5 mb-1.5 text-blue-600" />
            <span className="text-[11px] font-bold text-center">Tanda Tangan</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Standar</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('PARAF')}
            className={`flex flex-col items-center justify-center rounded-xl p-3 border-2 transition-all cursor-pointer ${
              selectedType === 'PARAF'
                ? 'border-amber-500 bg-amber-50/70 text-amber-700 shadow-sm ring-2 ring-amber-500/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            <FileCheck className="h-5 w-5 mb-1.5 text-amber-600" />
            <span className="text-[11px] font-bold text-center">Paraf</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Ringkas</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('NAME')}
            className={`flex flex-col items-center justify-center rounded-xl p-3 border-2 transition-all cursor-pointer ${
              selectedType === 'NAME'
                ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            <UserCheck className="h-5 w-5 mb-1.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-center">Nama & NIK</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Font Resmi</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('AUDIT_STAMP')}
            className={`flex flex-col items-center justify-center rounded-xl p-3 border-2 transition-all cursor-pointer ${
              selectedType === 'AUDIT_STAMP'
                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            <QrCode className="h-5 w-5 mb-1.5 text-emerald-600" />
            <span className="text-[11px] font-bold text-center">Stempel Audit</span>
            <span className="text-[9px] text-slate-400 mt-0.5">QR & Doc ID</span>
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