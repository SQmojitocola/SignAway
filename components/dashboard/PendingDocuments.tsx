import React from "react";

const mockDocuments = [
  { id: "ST-2023-10-045", name: "Surat Tugas Pemeriksaan Lapangan", sender: "Budi Santoso", div: "Divisi Operasional", date: "24 Okt 2023", time: "09:30 WIB", deadline: "Hari Ini", status: "MENUNGGU" },
  { id: "LHS-KLT-2023-992", name: "Laporan Hasil Survey Tambang", sender: "Siti Aminah", div: "Tim Ekspedisi", date: "23 Okt 2023", time: "14:15 WIB", deadline: "26 Okt 2023", status: "MENUNGGU" },
  { id: "BAST-PJ-004-X", name: "Berita Acara Serah Terima", sender: "Admin Pusat", div: "HRD & General Affairs", date: "22 Okt 2023", time: "08:00 WIB", deadline: "28 Okt 2023", status: "MENUNGGU" },
];

export default function PendingDocuments() {
  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      {/* Header Tabel */}
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-900">Dokumen Menunggu Tanda Tangan</h3>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Cari dokumen..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#003b73] focus:bg-white transition-all" 
            />
          </div>
          <button className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
          </button>
        </div>
      </div>
      
      {/* Isi Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-[#f4f5f8] border-b border-gray-200">
              <th className="py-3 px-6 text-xs text-gray-500 uppercase font-semibold">Nama Dokumen</th>
              <th className="py-3 px-6 text-xs text-gray-500 uppercase font-semibold">Pengirim</th>
              <th className="py-3 px-6 text-xs text-gray-500 uppercase font-semibold">Tanggal Diterima</th>
              <th className="py-3 px-6 text-xs text-gray-500 uppercase font-semibold">Deadline</th>
              <th className="py-3 px-6 text-xs text-gray-500 uppercase font-semibold">Status</th>
              <th className="py-3 px-6 text-xs text-gray-500 uppercase font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {mockDocuments.map((doc, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#fff8e6] text-[#d97706] flex items-center justify-center shrink-0 border border-[#fde68a]">
                      <span className="material-symbols-outlined text-[16px]">description</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{doc.id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-800">{doc.sender}<br/><span className="text-gray-400 text-xs block mt-0.5">{doc.div}</span></td>
                <td className="py-4 px-6 text-sm text-gray-800">{doc.date}<br/><span className="text-gray-400 text-xs block mt-0.5">{doc.time}</span></td>
                <td className={`py-4 px-6 text-sm font-medium ${doc.deadline === 'Hari Ini' ? 'text-red-500' : 'text-gray-800'}`}>{doc.deadline}</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fff8e6] text-[#d97706] border border-[#fde68a]">
                    {doc.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#003b73] text-white text-xs font-semibold hover:bg-[#002d58] transition-colors shadow-sm whitespace-nowrap">
                    Tanda Tangani
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-gray-200 bg-[#f8fafc] flex items-center justify-between">
        <p className="text-xs text-gray-500">Menampilkan 3 dari 12 dokumen</p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded bg-white border border-gray-200 text-gray-400 text-xs font-medium cursor-not-allowed" disabled>Sebelumnya</button>
          <button className="px-3 py-1.5 rounded bg-white border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm">Selanjutnya</button>
        </div>
      </div>
    </section>
  );
}