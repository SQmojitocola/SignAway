'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  UploadCloud,
  FileText,
  X,
  ChevronDown,
  Search,
  Save,
} from 'lucide-react'

interface UserContact {
  id: string
  name: string
  email: string
}

export default function UploadDocumentPage() {
  const router = useRouter()

  // State User Login (Pengirim / Saya Sendiri)
  const [currentUser, setCurrentUser] = useState<UserContact | null>(null)

  // State Unggah File
  const [file, setFile] = useState<File | null>(null)
  const [documentTitle, setDocumentTitle] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // State Resipien / Penandatangan
  const [savedContacts, setSavedContacts] = useState<UserContact[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<UserContact[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [uploading, setUploading] = useState(false)

  // State Pencarian/Penambahan Kontak Baru
  const [searchEmail, setSearchEmail] = useState('')
  const [foundContact, setFoundContact] = useState<UserContact | null>(null)
  const [newContactName, setNewContactName] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showAddContactForm, setShowAddContactForm] = useState(false)

  // 1. Ambil data session & DAFTAR KONTAK TERSIMPAN (/api/contacts)
  useEffect(() => {
    const initData = async () => {
      try {
        // Ambil data session pengguna login
        const sessionRes = await fetch('/api/auth/session')
        const contentTypeSession = sessionRes.headers.get('content-type')
        if (sessionRes.ok && contentTypeSession?.includes('application/json')) {
          const sessionData = await sessionRes.json()
          if (sessionData?.user) {
            setCurrentUser({
              id: sessionData.user.id || 'self',
              name: sessionData.user.name || 'Saya Sendiri',
              email: sessionData.user.email || '',
            })
          }
        }

        // 📍 AMBIL DAFTAR KONTAK DARI API /api/contacts
        const contactsRes = await fetch('/api/contacts')
        const contentTypeContacts = contactsRes.headers.get('content-type')
        if (contactsRes.ok && contentTypeContacts?.includes('application/json')) {
          const data = await contactsRes.json()
          setSavedContacts(data.contacts || [])
        }
      } catch (err) {
        console.warn('Informasi API tidak merespons JSON, menggunakan default:', err)
      }
    }

    initData()
  }, [])

  // 2. Gabungkan "Saya Sendiri" dan Daftar Kontak Tersimpan ke dalam KONTAK TERSEDIA
  const availableContacts = useMemo(() => {
    const list: UserContact[] = []

    if (currentUser) {
      list.push({
        id: currentUser.id,
        name: `${currentUser.name} (Saya)`,
        email: currentUser.email,
      })
    } else {
      list.push({
        id: 'self',
        name: 'Saya Sendiri (Pengirim)',
        email: 'pengirim@email.com',
      })
    }

    savedContacts.forEach((contact) => {
      if (contact.email.toLowerCase() !== currentUser?.email.toLowerCase()) {
        list.push(contact)
      }
    })

    return list
  }, [currentUser, savedContacts])

  // Handler Cari Kontak via Email
  const handleSearchContact = async () => {
    const cleanEmail = searchEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) return

    setIsSearching(true)
    setFoundContact(null)
    setShowAddContactForm(false)

    // Cek di lokal Kontak Tersedia
    const localMatch = availableContacts.find(
      (c) => c.email.toLowerCase() === cleanEmail
    )

    if (localMatch) {
      setFoundContact(localMatch)
      setIsSearching(false)
      return
    }

    // Cari ke Database User via API
    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(cleanEmail)}`)
      const contentType = res.headers.get('content-type')

      if (res.ok && contentType?.includes('application/json')) {
        const data = await res.json()
        if (data.user) {
          setFoundContact(data.user)
          return
        }
      }

      setShowAddContactForm(true)
      setNewContactName('')
    } catch (err) {
      console.error('Search error:', err)
      setShowAddContactForm(true)
    } finally {
      setIsSearching(false)
    }
  }

  // Handler Simpan Kontak Baru ke /api/contacts
  const handleSaveNewContact = async () => {
    if (!newContactName.trim() || !searchEmail.trim()) return

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newContactName.trim(), email: searchEmail.trim() }),
      })

      if (res.ok) {
        const contactsRes = await fetch('/api/contacts')
        if (contactsRes.ok) {
          const data = await contactsRes.json()
          setSavedContacts(data.contacts || [])
        }
      }
    } catch (err) {
      console.error('Save contact error:', err)
    } finally {
      setSearchEmail('')
      setShowAddContactForm(false)
    }
  }

  // Drag & Drop / Select File
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        setDocumentTitle(droppedFile.name.replace(/\.[^/.]+$/, ''))
      } else {
        alert('Format berkas harus PDF.')
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile)
        setDocumentTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
      } else {
        alert('Format berkas harus PDF.')
      }
    }
  }

  // Handler Tambah & Hapus Resipien
  const handleAddRecipient = (user: UserContact) => {
    if (!selectedRecipients.some((r) => r.id === user.id || r.email === user.email)) {
      setSelectedRecipients([...selectedRecipients, user])
    }
  }

  const handleRemoveRecipient = (userId: string) => {
    setSelectedRecipients(selectedRecipients.filter((r) => r.id !== userId))
  }

  // Submit Upload
  const handleSubmit = async () => {
    if (!file) {
      alert('Silakan pilih berkas PDF terlebih dahulu.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', documentTitle || file.name)
      formData.append('sequential', 'true')
      formData.append(
        'recipients',
        JSON.stringify(selectedRecipients.map((r) => ({ userId: r.id, email: r.email })))
      )

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const contentType = res.headers.get('content-type')
      if (res.ok && contentType?.includes('application/json')) {
        const data = await res.json()
        if (data.documentId) {
          router.push(`/documents/${data.documentId}/edit`)
          return
        }
      }

      alert('Gagal mengunggah dokumen. Silakan periksa server API.')
    } catch (err) {
      console.error('Upload Error:', err)
      alert('Terjadi kesalahan jaringan/server.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-100/80 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Alur Pengiriman</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Unggah Dokumen Baru</h1>
          <p className="text-sm font-normal text-slate-500 mt-1">
            Siapkan dokumen Anda untuk ditandatangani secara digital.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Dropzone PDF */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all min-h-[380px] ${
                  isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-blue-200 bg-blue-50/20'
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mb-4 shadow-sm">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Tarik & lepas dokumen di sini, atau{' '}
                  <label className="cursor-pointer text-blue-600 hover:underline">
                    telusuri berkas
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="mt-1 text-xs text-slate-400">Format PDF maks 25MB</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-sm">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      setDocumentTitle('')
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Dokumen
                  </label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Masukkan judul dokumen..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pengaturan Penandatangan */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800">Pengaturan Penandatangan</h2>

              {/* Form Cari Kontak via Email */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Cari Kontak via Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Masukkan email..."
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSearchContact}
                    disabled={isSearching || !searchEmail.includes('@')}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>

                {foundContact && (
                  <div className="flex items-center justify-between rounded-lg bg-white border border-blue-100 p-2 mt-2 shadow-sm">
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-slate-800">{foundContact.name}</p>
                      <p className="text-[10px] text-slate-500">{foundContact.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddRecipient(foundContact)
                        setFoundContact(null)
                        setSearchEmail('')
                      }}
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Pilih
                    </button>
                  </div>
                )}

                {showAddContactForm && (
                  <div className="space-y-2 rounded-lg bg-white border border-amber-200 p-2.5 mt-2">
                    <p className="text-[10px] text-amber-700 font-medium">
                      Email tidak ditemukan. Tulis nama untuk simpan:
                    </p>
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Nama Lengkap..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewContact}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      <Save className="h-3.5 w-3.5" /> Simpan Kontak
                    </button>
                  </div>
                )}
              </div>

              {/* Section KONTAK TERSEDIA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    KONTAK TERSEDIA
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {showUserDropdown ? 'Tutup' : 'Lihat Semua'}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        showUserDropdown ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                  {availableContacts.length > 0 ? (
                    availableContacts.map((user) => {
                      const isSelected = selectedRecipients.some(
                        (r) => r.id === user.id || r.email === user.email
                      )
                      const isSelf = currentUser && user.email === currentUser.email
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 shadow-sm"
                        >
                          <div className="truncate pr-2">
                            <p
                              className={`text-xs font-bold ${
                                isSelf ? 'text-blue-700' : 'text-slate-800'
                              }`}
                            >
                              {user.name}
                            </p>
                            <p className="text-[10px] text-slate-500">{user.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddRecipient(user)}
                            disabled={isSelected}
                            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold text-white ${
                              isSelf ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#1e3a5f] hover:bg-slate-800'
                            } disabled:opacity-40`}
                          >
                            {isSelected ? 'Terpilih' : 'Pilih'}
                          </button>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">Tidak ada kontak tersedia.</p>
                  )}
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* Daftar Penanda Tangan */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700">
                  Daftar Penanda Tangan ({selectedRecipients.length})
                </h3>

                <div className="min-h-[100px] rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                  {selectedRecipients.length > 0 ? (
                    selectedRecipients.map((recipient, index) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between rounded-lg bg-white p-2.5 shadow-sm border border-slate-200/60"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            {index + 1}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800">{recipient.name}</p>
                            <p className="text-[10px] text-slate-400">{recipient.email}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(recipient.id)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-20 items-center justify-center text-center">
                      <p className="text-xs text-slate-400">Belum ada penandatangan terpilih</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tombol Aksi Batal & Lanjutkan */}
            <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!file || selectedRecipients.length === 0 || uploading}
                onClick={handleSubmit}
                className="rounded-xl bg-blue-500 py-2.5 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Memproses...' : 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}