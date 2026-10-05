"use client";

import React, { useEffect, useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import PageHeaderBanner from "@/components/PageHeaderBanner";

export default function SettingsPage() {
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileNip, setProfileNip] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [activeTab, setActiveTab] = useState("profil");

  // State ubah password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // State untuk Toggle Notifikasi
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [otpRequired, setOtpRequired] = useState(true);

  // State untuk Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [avatarMessage, setAvatarMessage] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const response = await fetch("/api/users?me=true");
        if (!response.ok) {
          throw new Error("Profil tidak dapat dimuat");
        }
        const data = await response.json();
        if (isMounted) {
          setProfileName(data.user?.name ?? "");
          setProfileEmail(data.user?.email ?? "");
          setProfileNip(data.user?.nip ?? "");
          setProfileRole(data.user?.role ?? "KARYAWAN");
          setAvatarUrl(data.user?.avatarUrl ?? null);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setProfileError("Profil tidak dapat dimuat");
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleProfileSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, email: profileEmail, nip: profileNip }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Profil gagal disimpan");
      setProfileName(data.user.name);
      setProfileEmail(data.user.email);
      setProfileNip(data.user.nip ?? "");
      setProfileMessage("Profil berhasil disimpan");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Profil gagal disimpan");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.');
      return;
    }

    // Validasi ukuran file (maks 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setAvatarError('Ukuran file terlalu besar. Maksimal 5MB.');
      return;
    }

    setAvatarError('');
    setAvatarMessage('');

    // Buat preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    setAvatarUploading(true);
    setAvatarError('');
    setAvatarMessage('');

    try {
      const formData = new FormData();
      formData.append('avatar', fileInputRef.current.files[0]);

      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Gagal mengunggah avatar');

      setAvatarUrl(data.user.avatarUrl);
      setAvatarPreview(null);
      setAvatarMessage('Avatar berhasil diunggah!');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Gagal mengunggah avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarUploading(true);
    setAvatarError('');
    setAvatarMessage('');

    try {
      const response = await fetch('/api/users/avatar', {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Gagal menghapus avatar');

      setAvatarUrl(null);
      setAvatarPreview(null);
      setAvatarMessage('Avatar berhasil dihapus!');
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Gagal menghapus avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Semua field kata sandi wajib diisi");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Kata sandi baru minimal 8 karakter");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi baru tidak cocok");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Gagal memperbarui kata sandi");
      setPasswordMessage("Kata sandi berhasil diperbarui!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Gagal memperbarui kata sandi");
    } finally {
      setPasswordSaving(false);
    }
  };

  const roleLabel =
    profileRole === "ADMIN"
      ? "Administrator"
      : profileRole === "ATASAN"
        ? "Atasan / Verifikator"
        : "Karyawan / Staf";

  const initials = profileName
    ? profileName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("")
    : "U";
  return (
    <div className="max-w-6xl w-full mx-auto flex flex-col gap-6 pb-16 font-sans text-slate-800">

          {/* Header Banner Card */}
          <PageHeaderBanner
            title="Pengaturan Akun"
            subtitle="Kelola profil akun, NIP, keamanan kata sandi, dan preferensi notifikasi."
            action={
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs border border-white/20 rounded-full pl-2 pr-4 py-1.5 shadow-sm">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white text-[#003b73] flex items-center justify-center font-bold text-xs shrink-0">
                    {initials}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-white leading-tight">
                      {profileLoading ? "Memuat..." : profileName || "Pengguna"}
                    </span>
                    <span className="text-[10px] text-blue-200 leading-tight">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>
            }
          />

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-6 min-w-max">
              <button
                onClick={() => setActiveTab("profil")}
                className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === "profil"
                  ? "text-[#003b73] border-[#003b73]"
                  : "text-gray-500 border-transparent hover:text-gray-900"
                  }`}
              >
                <MaterialIcon name="person" size={20} />
                Profil Pengguna
              </button>

              <button
                onClick={() => setActiveTab("signature")}
                className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${activeTab === "signature"
                  ? "text-[#003b73] border-[#003b73] font-semibold"
                  : "text-gray-500 border-transparent hover:text-gray-900"
                  }`}
              >
                <MaterialIcon name="draw" size={20} />
                Atur Tanda Tangan Digital
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${activeTab === "security"
                  ? "text-[#003b73] border-[#003b73] font-semibold"
                  : "text-gray-500 border-transparent hover:text-gray-900"
                  }`}
              >
                <MaterialIcon name="lock_reset" size={20} />
                Keamanan & Sandi
              </button>

              <button
                onClick={() => setActiveTab("notif")}
                className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${activeTab === "notif"
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

              {profileMessage && (
                <div className="mb-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg text-xs font-medium">
                  <MaterialIcon name="check_circle" size={18} />
                  <span>{profileMessage}</span>
                </div>
              )}

              {profileError && (
                <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg text-xs font-medium">
                  <MaterialIcon name="error" size={18} />
                  <span>{profileError}</span>
                </div>
              )}



              <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 pb-6 border-b border-gray-100">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-[#003b73] text-white border-2 border-blue-100 flex items-center justify-center font-bold text-2xl shrink-0 shadow-inner">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <MaterialIcon name="photo_camera" size={20} className="text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-bold text-slate-800">{profileName || "Pengguna"}</h4>
                  <p className="text-xs text-slate-500">{profileEmail}</p>
                  <span className="inline-block mt-1 w-fit text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#003b73] border border-blue-200">
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Avatar Upload Actions */}
              {(avatarPreview || avatarUrl) && (
                <div className="mb-6 space-y-3">
                  {avatarMessage && (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg text-xs font-medium">
                      <MaterialIcon name="check_circle" size={18} />
                      <span>{avatarMessage}</span>
                    </div>
                  )}

                  {avatarError && (
                    <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg text-xs font-medium">
                      <MaterialIcon name="error" size={18} />
                      <span>{avatarError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={avatarUploading}
                        className="px-4 py-2 bg-[#003b73] hover:bg-[#002d58] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <MaterialIcon name="upload" size={16} />
                        {avatarUploading ? "Mengunggah..." : "Unggah Avatar"}
                      </button>
                    )}
                    {avatarUrl && !avatarPreview && (
                      <button
                        type="button"
                        onClick={handleAvatarDelete}
                        disabled={avatarUploading}
                        className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <MaterialIcon name="delete" size={16} />
                        {avatarUploading ? "Menghapus..." : "Hapus Avatar"}
                      </button>
                    )}
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Lengkap</label>
                  <div className="relative">
                    <MaterialIcon name="person" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      disabled={profileLoading || profileSaving}
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
                      required
                      value={profileEmail}
                      onChange={(event) => setProfileEmail(event.target.value)}
                      disabled={profileLoading || profileSaving}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003b73]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">NIP / NIK Karyawan</label>
                  <div className="relative">
                    <MaterialIcon name="badge" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Contoh: 1751103 atau PTSI-261324"
                      value={profileNip}
                      onChange={(event) => setProfileNip(event.target.value)}
                      disabled={profileLoading || profileSaving}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003b73]"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Dicantumkan pada plot Nama & NIK saat menandatangani dokumen.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Peran / Hak Akses</label>
                  <div className="relative">
                    <MaterialIcon name="corporate_fare" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      readOnly
                      value={roleLabel}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={profileSaving || profileLoading}
                    className="px-5 py-2 bg-[#003b73] hover:bg-[#002d58] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <MaterialIcon name="save" size={16} />
                    {profileSaving ? "Menyimpan..." : "Simpan Perubahan Profil"}
                  </button>
                </div>
              </form>
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
                    <button type="button" className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-[#003b73] text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                      <MaterialIcon name="draw" size={16} />
                      Perbarui Tanda Tangan
                    </button>
                    <button type="button" className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
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
                <p className="text-xs text-gray-500 mt-0.5">Kelola kata sandi akun untuk menjaga integritas dan keamanan akun Anda.</p>
              </div>

              {passwordMessage && (
                <div className="mb-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg text-xs font-medium">
                  <MaterialIcon name="check_circle" size={18} />
                  <span>{passwordMessage}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg text-xs font-medium">
                  <MaterialIcon name="logout" size={18} />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 mb-3">Ubah Kata Sandi Akun</h4>
                  <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Kata Sandi Saat Ini</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
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
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimal 8 karakter"
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
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
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

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={passwordSaving}
                        className="px-5 py-2 bg-[#003b73] hover:bg-[#002d58] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <MaterialIcon name="save" size={16} />
                        {passwordSaving ? "Memperbarui..." : "Perbarui Kata Sandi"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="border border-gray-200 rounded-xl p-5 bg-[#fafbfd] flex flex-col justify-between h-fit">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-gray-700">Autentikasi Sesi & Keamanan</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <MaterialIcon name="security" size={12} />
                        Aktif
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Sesi akun Anda dilindungi dengan token enkripsi JWT NextAuth. Anda dapat memperbarui kata sandi secara berkala untuk menjaga keamanan akun dinas Anda.
                    </p>
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
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ml-4 ${notifWeekly ? "bg-[#00529c]" : "bg-gray-200"
                      }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${notifWeekly ? "translate-x-5" : "translate-x-0"
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
  );
}