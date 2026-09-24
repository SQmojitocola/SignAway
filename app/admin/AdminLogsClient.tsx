'use client'

import React, { useState } from 'react'

export interface LogItem {
    id: string
    ipAddress: string
    signedAt: string
    document: {
        id: string
        title: string
        status: string
    }
    signer: {
        id: string
        name: string
        email: string
    }
}

interface AdminLogsClientProps {
    initialLogs: LogItem[]
}

export default function AdminLogsClient({ initialLogs }: AdminLogsClientProps) {
    const [searchTerm, setSearchTerm] = useState('')

    // Filter pencarian berdasarkan judul dokumen, nama, email, atau IP
    const filteredLogs = initialLogs.filter((log) => {
        const q = searchTerm.toLowerCase()
        return (
            log.document.title.toLowerCase().includes(q) ||
            log.signer.name.toLowerCase().includes(q) ||
            log.signer.email.toLowerCase().includes(q) ||
            log.ipAddress.toLowerCase().includes(q)
        )
    })

    // Format tanggal & jam WIB
    const formatDateTime = (dateString: string) => {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(new Date(dateString))
    }

    return (
        <div className="space-y-4">
            {/* Search & Counter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Cari dokumen, nama, email, atau IP..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003b73] focus:bg-white transition-all"
                    />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                    Menampilkan <span className="font-bold text-slate-800">{filteredLogs.length}</span> dari{' '}
                    {initialLogs.length} log
                </div>
            </div>

            {/* Tabel Log Audit Trail */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="py-3 px-5 text-xs text-slate-600 uppercase font-semibold">Waktu (WIB)</th>
                                <th className="py-3 px-5 text-xs text-slate-600 uppercase font-semibold">Dokumen Terkait</th>
                                <th className="py-3 px-5 text-xs text-slate-600 uppercase font-semibold">Penandatangan</th>
                                <th className="py-3 px-5 text-xs text-slate-600 uppercase font-semibold">Alamat IP</th>
                                <th className="py-3 px-5 text-xs text-slate-600 uppercase font-semibold text-center">Integritas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-2">
                                            history_toggle_off
                                        </span>
                                        Tidak ada riwayat tanda tangan digital yang ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                        {/* Timestamp */}
                                        <td className="py-3.5 px-5 font-mono text-xs text-slate-700 whitespace-nowrap">
                                            {formatDateTime(log.signedAt)}
                                        </td>

                                        {/* Dokumen */}
                                        <td className="py-3.5 px-5">
                                            <div className="flex items-center gap-2.5">
                                                <span className="material-symbols-outlined text-slate-400 text-[18px]">
                                                    description
                                                </span>
                                                <div>
                                                    <p className="font-medium text-slate-900 leading-snug">{log.document.title}</p>
                                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {log.document.id.slice(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Penandatangan */}
                                        <td className="py-3.5 px-5">
                                            <div>
                                                <p className="font-semibold text-slate-800">{log.signer.name}</p>
                                                <p className="text-xs text-slate-500">{log.signer.email}</p>
                                            </div>
                                        </td>

                                        {/* IP Address */}
                                        <td className="py-3.5 px-5 font-mono text-xs">
                                            <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md">
                                                {log.ipAddress || '127.0.0.1'}
                                            </span>
                                        </td>

                                        {/* Status / Verifikasi */}
                                        <td className="py-3.5 px-5 text-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <span className="material-symbols-outlined text-[14px]">verified</span>
                                                Sah & Tercatat
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}