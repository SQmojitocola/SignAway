'use client'

import { useState, useEffect } from 'react'
import { Search, UserPlus, Trash2, Mail, CheckCircle2, AlertCircle, Save } from 'lucide-react'

interface Contact {
  id: string
  name: string
  email: string
  createdAt: string
}

interface FoundUser {
  id: string
  name: string
  email: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // State Pencarian Pengguna
  const [emailInput, setEmailInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null)
  const [manualNameInput, setManualNameInput] = useState('')
  const [notFound, setNotFound] = useState(false)

  // State Status Aksi
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts')
      const data = await res.json()
      if (res.ok) {
        setContacts(data.contacts || [])
      }
    } catch (err) {
      console.error('Gagal memuat kontak:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  // 📍 1. Handler Cari Akun Pengguna via Email
  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = emailInput.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) return

    setIsSearching(true)
    setFoundUser(null)
    setNotFound(false)
    setMessage(null)

    // Cek apakah sudah ada di kontak tersimpan
    const alreadySaved = contacts.some((c) => c.email.toLowerCase() === cleanEmail)
    if (alreadySaved) {
      setMessage({ type: 'error', text: 'Email ini sudah ada di daftar kontak Anda.' })
      setIsSearching(false)
      return
    }

    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(cleanEmail)}`)
      const contentType = res.headers.get('content-type')

      if (res.ok && contentType?.includes('application/json')) {
        const data = await res.json()
        if (data.user) {
          setFoundUser(data.user)
          return
        }
      }

      // Jika tidak terdaftar di database pengguna
      setNotFound(true)
      setManualNameInput('')
    } catch (err) {
      console.error('Search user error:', err)
      setNotFound(true)
    } finally {
      setIsSearching(false)
    }
  }

  // 📍 2. Handler Simpan Kontak
  const handleSaveContact = async (nameToSave: string, emailToSave: string) => {
    if (!nameToSave.trim() || !emailToSave.trim()) return

    setIsSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameToSave.trim(), email: emailToSave.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        setEmailInput('')
        setFoundUser(null)
        setNotFound(false)
        setManualNameInput('')
        setMessage({ type: 'success', text: 'Kontak berhasil disimpan!' })
        fetchContacts()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.message || 'Gagal menyimpan kontak.' })
      }
    } catch (err) {
      console.error('Save contact error:', err)
      setMessage({ type: 'error', text: 'Terjadi kesalahan server.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler Hapus Kontak
  const handleDeleteContact = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kontak ini?')) return

    try {
      const res = await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setContacts(contacts.filter((c) => c.id !== id))
      }
    } catch (err) {
      console.error('Delete contact error:', err)
    }
  }

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen w-full bg-slate-100/80 p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Daftar Kontak Penandatangan</h1>
        <p className="text-xs text-slate-500 mt-1">
          Cari email pengguna dan simpan ke daftar kontak untuk mempermudah alur penandatanganan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Panel Cari & Tambah Kontak */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 h-fit space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-600" /> Cari & Tambah Kontak
          </h2>

          {message && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* Form Input Email & Cari */}
          <form onSubmit={handleSearchUser} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email Pengguna
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value)
                    setFoundUser(null)
                    setNotFound(false)
                  }}
                  placeholder="Masukkan email (contoh: santos@gmail.com)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching || !emailInput.includes('@')}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#1e4273] py-2.5 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              {isSearching ? 'Mencari Akun...' : 'Cari Pengguna'}
            </button>
          </form>

          {/* Result 1: Akun Ditemukan di Database */}
          {foundUser && (
            <div className="space-y-3 rounded-xl bg-blue-50/60 border border-blue-200 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                AKUN DITEMUKAN
              </p>
              <div>
                <p className="text-xs font-bold text-slate-800">{foundUser.name}</p>
                <p className="text-[10px] text-slate-500">{foundUser.email}</p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveContact(foundUser.name, foundUser.email)}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                {isSubmitting ? 'Menyimpan...' : 'Simpan ke Daftar Kontak'}
              </button>
            </div>
          )}

          {/* Result 2: Akun Tidak Ditemukan (Minta Input Nama Manual) */}
          {notFound && (
            <div className="space-y-3 rounded-xl bg-amber-50/80 border border-amber-200 p-4">
              <p className="text-[11px] font-medium text-amber-800">
                Email tidak terdaftar sebagai pengguna. Tuliskan nama lengkap untuk menyimpan secara manual:
              </p>
              <input
                type="text"
                value={manualNameInput}
                onChange={(e) => setManualNameInput(e.target.value)}
                placeholder="Nama Lengkap..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-amber-500"
              />
              <button
                type="button"
                disabled={isSubmitting || !manualNameInput.trim()}
                onClick={() => handleSaveContact(manualNameInput, emailInput)}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                {isSubmitting ? 'Menyimpan...' : 'Simpan Kontak Manual'}
              </button>
            </div>
          )}
        </div>

        {/* Tabel / List Kontak Tersimpan */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-slate-800">
              Kontak Tersimpan ({contacts.length})
            </h2>

            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama / email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Memuat data kontak...</div>
          ) : filteredContacts.length > 0 ? (
            <div className="space-y-2">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{contact.name}</p>
                      <p className="text-[10px] text-slate-500">{contact.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteContact(contact.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada kontak tersimpan.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}