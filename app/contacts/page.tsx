'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Search, Mail, User, CheckCircle2 } from 'lucide-react'

interface Contact {
  id: string
  name: string
  email: string
  createdAt: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

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

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setIsSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })

      const data = await res.json()

      if (res.ok) {
        setName('')
        setEmail('')
        setMessage('Kontak berhasil disimpan!')
        fetchContacts()
        setTimeout(() => setMessage(null), 3000)
      } else {
        alert(data.message || 'Gagal menyimpan kontak.')
      }
    } catch (err) {
      console.error('Save contact error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

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
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen w-full bg-slate-100/80 p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Daftar Kontak Penandatangan</h1>
        <p className="text-xs text-slate-500 mt-1">
          Kelola daftar relasi untuk mempermudah pemilihan penandatangan dokumen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form Tambah Kontak Baru */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 h-fit space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-600" /> Tambah Kontak Baru
          </h2>

          {message && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {message}
            </div>
          )}

          <form onSubmit={handleAddContact} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Santos"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: santos@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#1e4273] py-2.5 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Simpan...' : 'Simpan Kontak'}
            </button>
          </form>
        </div>

        {/* Tabel / Lista Kontak */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-slate-800">
              Kontak Tersimpan ({contacts.length})
            </h2>

            {/* Field Cari */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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