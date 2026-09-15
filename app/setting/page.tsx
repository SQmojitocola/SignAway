"use client";

import React, { useEffect, useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";

export default function SettingsPage() {
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profil");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State untuk Toggle Notifikasi
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [otpRequired, setOtpRequired] = useState(true);

  useEffect(() => {
    fetch("/api/users?me=true")
      .then(async (response) => {
        if (!response.ok) throw new Error("Profil tidak dapat dimuat")
        const data = await response.json()
        setProfileName(data.user?.name ?? "")
        setProfileEmail(data.user?.email ?? "")
      })
      .catch(() => setProfileMessage("Profil tidak dapat dimuat"))
      .finally(() => setProfileLoading(false))
  }, [])

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileMessage("")
    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, email: profileEmail }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message ?? "Profil gagal disimpan")
      setProfileName(data.user.name)
      setProfileEmail(data.user.email)
      setProfileMessage("Profil berhasil disimpan")
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Profil gagal disimpan")
    } finally {
      setProfileSaving(false)
    }
  }

  return (
    <div className="bg-[#f8fafc] text-gray-900 min-h-screen font-sans">
      <main className="min-w-0 flex flex-col">
        <div className="p-8 max-w-6xl w-full mx-auto flex flex-col gap-6 pb-16">
          
          {/* Top Bar / Header */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pengaturan</h2>
              <p className="text-sm text-gray-500 mt-1">
                Kelola profil akun, tanda tangan digital, keamanan, dan preferensi notifikasi.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notifikasi Bell */}
              <button className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors relative shadow-sm">
                <MaterialIcon name="notifications" size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>

              {/* User Profile Pill */}
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full pl-2 pr-4 py-1.5 shadow-sm">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0">
                  <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZmBjA9e4kw9uWCJDI7f4TH_2jlXCZjf3nkxYaDS3u06ISe_vlZYWADmJPpIQh5npgRdWVb4s4VnnsGtuAn8wsxoC50q918pnHoUokC6HsqjQV0ccuvLEwjvIOUehCoMjPxOzl-cXBB6EaMfY8ZowAovjxcomXGhgkTUfGqZ7oDbcce21JLrCXv63u0bPHg_SdsCjeXUlQGrMiJ0CkALdS_3dq2NlyYfEcEFntZvES9tu_jUYjLXaO2Q" 
                    alt="Ahmad Fauzan" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-gray-900 leading-tight">Ahmad Fauzan</span>
                  <span className="text-[11px] text-gray-400 leading-tight">Admin Pusat</span>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-6 min-w-max">
              <button 
                onClick={() => setActiveTab("profil")}
                className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "profil" 
                    ? "text-[#003b73] border-[#003b73]" 
                    : "text-gray-500 border-transparent hover:text-gray-900"
                }`}
              >
                <MaterialIcon name="person" size={20} />
                Profil Pengguna
              </button>

              <button 
                onClick={() => setActiveTab("signature")}
                className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "signature" 
                    ? "text-[#003b73] border-[#003b73] font-semibold" 
                    : "text-gray-500 border-transparent hover:text-gray-900"
                }`}
              >
                <MaterialIcon name="draw" size={20} />
                Atur Tanda Tangan Digital 
              </button>

              <button 
                onClick={() => setActiveTab("security")}
                className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "security" 
                    ? "text-[#003b73] border-[#003b73] font-semibold" 
                    : "text-gray-500 border-transparent hover:text-gray-900"
                }`}
              >
                <MaterialIcon name="lock_reset" size={20} />
                Keamanan & Sandi
              </button>

              <button 
                onClick={() => setActiveTab("notif")}
                className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "notif" 
                    ? "text-[#003b73] border-[#003b73] font-semibold" 
                    : "text-gray-500 border-transparent hover:text-gray-900"
                }`}
              >
                <MaterialIcon name="notifications_active" size={20} />
                Notifikasi
              </button>

            </nav>
          </div>

          {activeTab === "profil" && (
            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="pb-4 border-b border-gray-100 mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MaterialIcon name="badge" className="text-[#003b73]" />
                  Profil Pengguna
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Informasi akun dan identitas resmi kedinasan PT Surveyor Indonesia.</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 pb-6 border-b border-gray-100">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-blue-100 shrink-0">
                  <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZmBjA9e4kw9uWCJDI7f4TH_2jlXCZjf3nkxYaDS3u06ISe_vlZYWADmJPpIQh5npgRdWVb4s4VnnsGtuAn8wsxoC50q918pnHoUokC6HsqjQV0ccuvLEwjvIOUehCoMjPxOzl-cXBB6EaMfY8ZowAovjxcomXGhgkTUfGqZ7oDbcce21JLrCXv63u0bPHg_SdsCjeXUlQGrMiJ0CkALdS_3dq2NlyYfEcEFntZvES9tu_jUYjLXaO2Q" 
                    alt="Ahmad Fauzan" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <button className="bg-[#003b73] hover:bg-[#002d58] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                      <MaterialIcon name="photo_camera" size={16} />
                      Ubah Foto
                    </button>
                    <button className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                      Hapus
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">Disarankan format JPG, PNG atau WEBP resolusi minimal 400×400 piksel (Maks. 2MB).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Lengkap</label>
                  <div className="relative">
                    <MaterialIcon name="person" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      disabled={profileLoading}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003b73]" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">NIP / ID Karyawan</label>
                  <div className="relative">
                    <MaterialIcon name="id_card" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      readOnly 
                      defaultValue="PTS-2023-0894"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Jabatan / Divisi</label>
                  <div className="relative">
                    <MaterialIcon name="corporate_fare" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      defaultValue="Direktur Operasional / Pengelola Dokumen"
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003b73]" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Perusahaan</label>
                  <div className="relative">
                    <MaterialIcon name="mail" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email" 
                      value={profileEmail}
                      onChange={(event) => setProfileEmail(event.target.value)}
                      disabled={profileLoading}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003b73]" 
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nomor Telepon / WhatsApp</label>
                  <div className="relative max-w-md">
                    <MaterialIcon name="call" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="tel" 
                      defaultValue="+62 812 8901 2345"
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003b73]" 
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "signature" && (
            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 mb-6 gap-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MaterialIcon name="fingerprint" className="text-[#003b73]" />
                    Tanda Tangan Digital
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Atur dan kelola spesimen tanda tangan digital Anda.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-6">
                <div className="border border-gray-200 rounded-xl p-5 bg-[#fafbfd] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-700">Spesimen Tersimpan</span>
                      <MaterialIcon name="draw" size={18} className="text-[#003b73]" />
                    </div>
                    <div className="h-32 bg-white rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                      <svg className="w-44 h-16 text-[#003b73]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 200 80">
                        <path d="M 20 50 C 45 20, 60 70, 75 40 C 90 10, 95 65, 120 45 C 145 25, 140 60, 160 30 C 175 10, 185 45, 190 35"></path>
                        <path d="M 50 65 L 175 55" strokeWidth="1.5"></path>
                      </svg>
                      <span className="text-[10px] font-mono text-gray-400 absolute bottom-1.5 right-2">SHA256: 9b7a...3c41</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <button className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-[#003b73] text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                      <MaterialIcon name="draw" size={16} />
                      Perbarui Tanda Tangan
                    </button>
                    <button className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                      <MaterialIcon name="pin" size={16} />
                      Atur Ulang PIN Tanda Tangan
                    </button>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={otpRequired}
                        onChange={(e) => setOtpRequired(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#003b73] focus:ring-[#003b73]" 
                      />
                      <div>
                        <span className="text-xs font-semibold text-gray-900 block">Wajibkan verifikasi OTP saat menandatangani dokumen penting</span>
                        <span className="text-[11px] text-gray-500">
                          Sistem akan mengirimkan kode verifikasi 6-digit ke WhatsApp/SMS terdaftar untuk setiap transaksi penandatanganan dokumen legal dan kontrak.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "security" && (
            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="pb-4 border-b border-gray-100 mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MaterialIcon name="lock" className="text-[#003b73]" />
                  Keamanan & Kata Sandi
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Kelola kata sandi akun dan autentikasi berlapis untuk menjaga integritas data.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 mb-3">Ubah Kata Sandi</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Kata Sandi Saat Ini</label>
                      <div className="relative">
                        <input 
                          type={showCurrentPassword ? "text" : "password"} 
                          placeholder="Masukkan kata sandi lama"
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003b73]" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          <MaterialIcon name={showCurrentPassword ? "visibility_off" : "visibility"} size={18} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Kata Sandi Baru</label>
                      <div className="relative">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          placeholder="Minimal 8 karakter dengan angka & simbol"
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003b73]" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          <MaterialIcon name={showNewPassword ? "visibility_off" : "visibility"} size={18} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Ulangi kata sandi baru"
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003b73]" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          <MaterialIcon name={showConfirmPassword ? "visibility_off" : "visibility"} size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-8">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-3">Autentikasi Dua Faktor (2FA)</h4>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <MaterialIcon name="security" size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">2FA Terproteksi</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Google Authenticator / SMS Token aktif</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-full">Aktif</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Setiap login dari perangkat baru akan memerlukan verifikasi token keamanan untuk melindungi dokumen BUMN yang bersifat rahasia.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button className="text-[#003b73] hover:text-[#00529c] text-xs font-semibold flex items-center gap-1.5 transition-colors">
                      <MaterialIcon name="devices" size={16} />
                      Kelola Sesi Login Aktif (2 Perangkat)
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "notif" && (
            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="pb-4 border-b border-gray-100 mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MaterialIcon name="notifications" className="text-[#003b73]" />
                  Pengaturan Notifikasi
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Atur kapan dan bagaimana Anda menerima pemberitahuan alur persetujuan dokumen.</p>
              </div>

              <div className="space-y-5 divide-y divide-gray-100">
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Laporan mingguan dokumen selesai</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Kirim rekapitulasi performa audit & jumlah dokumen yang berhasil ditandatangani setiap Senin pagi.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setNotifWeekly(!notifWeekly)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ml-4 ${
                      notifWeekly ? "bg-[#00529c]" : "bg-gray-200"
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      notifWeekly ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Footer Actions & Toast */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-medium">
              <MaterialIcon name="check_circle" size={18} />
              <span>{profileMessage || "Semua konfigurasi terbaru telah tersinkronisasi dengan aman."}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors">
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={profileSaving || profileLoading}
                className="px-5 py-2 bg-[#003b73] hover:bg-[#002d58] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <MaterialIcon name="save" size={16} />
                {profileSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}