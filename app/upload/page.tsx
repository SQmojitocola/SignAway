'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  UploadCloud, Trash2, UserPlus, FileText, ChevronDown, Check, Save 
} from 'lucide-react'

interface Recipient {
  id: string
  name: string
  email: string
  nip?: string
}

interface UploadDraft {
  documentId?: string
  fileBase64: string
  fileName: string
  fileSize: number
  fileType: string
  savedContacts: Recipient[]
  selectedRecipients: Recipient[]
  sequential: boolean
}

const UPLOAD_DRAFT_DB = 'signaway-upload-draft'
const UPLOAD_DRAFT_STORE = 'drafts'

function openUploadDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(UPLOAD_DRAFT_DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(UPLOAD_DRAFT_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadUploadDraft(): Promise<UploadDraft | null> {
  const db = await openUploadDraftDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(UPLOAD_DRAFT_STORE, 'readonly')
      .objectStore(UPLOAD_DRAFT_STORE)
      .get('current')
    request.onsuccess = () => resolve((request.result as UploadDraft | undefined) || null)
    request.onerror = () => reject(request.error)
  })
}

async function saveUploadDraft(draft: UploadDraft): Promise<void> {
  const db = await openUploadDraftDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(UPLOAD_DRAFT_STORE, 'readwrite')
      .objectStore(UPLOAD_DRAFT_STORE)
      .put(draft, 'current')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function clearUploadDraft(): Promise<void> {
  const db = await openUploadDraftDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(UPLOAD_DRAFT_STORE, 'readwrite')
      .objectStore(UPLOAD_DRAFT_STORE)
      .delete('current')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export default function UploadDocumentPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // State File & Konten
  const [file, setFile] = useState<File | null>(null)
  const [fileBase64, setFileBase64] = useState<string>('')
  
  // State Kontak & Penandatangan
  const [savedContacts, setSavedContacts] = useState<Recipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([])
  const [sequential, setSequential] = useState(false)
  const [draftDocumentId, setDraftDocumentId] = useState<string | undefined>()
  
  // State UI & Search
  const [showDropdown, setShowDropdown] = useState(false)
  const [showSearchSection, setShowSearchSection] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [foundUser, setFoundUser] = useState<Recipient | null>(null)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [error, setError] = useState('')
  const [draftLoaded, setDraftLoaded] = useState(false)

  useEffect(() => {
    loadUploadDraft()
      .then((draft) => {
        if (!draft) {
          setDraftLoaded(true)
          return
        }

        queueMicrotask(() => {
          setFileBase64(draft.fileBase64)
          setSavedContacts(draft.savedContacts)
          setSelectedRecipients(draft.selectedRecipients)
          setSequential(draft.sequential ?? false)
          setDraftDocumentId(draft.documentId)
        })

        return fetch(draft.fileBase64)
          .then((response) => response.blob())
          .then((blob) => {
            setFile(new File([blob], draft.fileName, {
              type: draft.fileType || blob.type || 'application/pdf',
              lastModified: Date.now(),
            }))
          })
      })
      .catch(() => setError('Draft dokumen tidak dapat dipulihkan'))
      .finally(() => setDraftLoaded(true))

    fetch('/api/users?me=true')
      .then((response) => response.json())
      .then((data) => {
        if (data.user) {
          setSavedContacts((current) => current.some((contact) => contact.id === data.user.id)
            ? current
            : [data.user, ...current])
        }
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!draftLoaded) return

    if (!fileBase64 && savedContacts.length === 0 && selectedRecipients.length === 0 && !draftDocumentId) {
      void clearUploadDraft()
      return
    }

    const draft: UploadDraft = {
      fileBase64,
      fileName: file?.name || '',
      fileSize: file?.size || 0,
      fileType: file?.type || 'application/pdf',
      savedContacts,
      selectedRecipients,
      sequential,
      documentId: draftDocumentId,
    }
    void saveUploadDraft(draft)
  }, [draftLoaded, draftDocumentId, file, fileBase64, savedContacts, selectedRecipients, sequential])

  // Handle Pilih PDF
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    if (selectedFile.type !== 'application/pdf') {
      setError('Hanya file PDF yang diperbolehkan.')
      return
    }

    setFile(selectedFile)
  setDraftDocumentId(undefined)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setFileBase64(reader.result as string)
    reader.readAsDataURL(selectedFile)
  }

  // Cari Kontak via API
  const handleSearchUser = async () => {
    if (!searchEmail) return
    setLoadingSearch(true)
    setFoundUser(null)
    setError('')
    
    try {
      const res = await fetch(`/api/users?email=${encodeURIComponent(searchEmail)}`)
      const data = await res.json()
      if (res.ok && data.user) {
        setFoundUser(data.user)
      } else {
        setError('Pengguna tidak ditemukan')
      }
    } catch {
      setError('Gagal mencari kontak')
    } finally {
      setLoadingSearch(false)
    }
  }

  // SIMPAN KE KONTAK TERSEDIA (Klik Save)
  const handleSaveToContacts = (user: Recipient) => {
    if (savedContacts.some((c) => c.id === user.id)) {
      setError('Kontak ini sudah ada di Kontak Tersedia')
      return
    }
    setSavedContacts([...savedContacts, user])
    setFoundUser(null)
    setSearchEmail('')
    setShowSearchSection(false)
  }

  // PILIH KONTAK MENJADI PENANDATANGAN
  const toggleSelectRecipient = (user: Recipient) => {
    if (selectedRecipients.some((r) => r.id === user.id)) {
      setSelectedRecipients(selectedRecipients.filter((r) => r.id !== user.id))
    } else {
      setSelectedRecipients([...selectedRecipients, user])
    }
  }

  // Submit ke API Backend Upload
  const handleSubmit = async () => {
    if (!file || !fileBase64) {
      setError('Silakan pilih file PDF terlebih dahulu')
      return
    }
    if (selectedRecipients.length === 0) {
      setError('Pilih minimal 1 penandatangan')
      return
    }

    setLoadingSubmit(true)
    try {
      const upload = (documentId?: string) => fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name,
          pdfBase64: fileBase64,
          recipientIds: selectedRecipients.map((r) => r.id),
          sequential,
          ...(documentId ? { documentId } : {}),
        }),
      })

      let res = await upload(draftDocumentId)
      let data = await res.json()
      if (res.status === 404 && draftDocumentId) {
        setDraftDocumentId(undefined)
        res = await upload()
        data = await res.json()
      }
      if (!res.ok) throw new Error(data.message || 'Gagal mengunggah dokumen')

      setDraftDocumentId(data.document.id)
      router.push(`/documents/${data.document.id}/edit`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah dokumen')
    } finally {
      setLoadingSubmit(false)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Unggah Dokumen Baru</h1>
        <p className="text-xs text-slate-500">Siapkan dokumen Anda untuk ditandatangani secara digital.</p>
      </header>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Upload Dropzone & Panel Cari */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 min-h-[350px] flex flex-col justify-center">
            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-200 rounded-2xl p-10 text-center cursor-pointer hover:bg-blue-50/50"
              >
                <input type="file" ref={fileInputRef} accept="application/pdf" className="hidden" onChange={handleFileChange} />
                <UploadCloud className="mx-auto w-12 h-12 text-blue-600 mb-3" />
                <p className="text-sm font-semibold text-slate-700">
                  Tarik & lepas dokumen di sini, atau <span className="text-blue-600 underline">telusuri berkas</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">Format PDF maks 25MB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">File Dokumen</p>
                <div className="flex items-center justify-between p-4 bg-[#1e4273] text-white rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-300" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-[11px] text-blue-200">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => { setFile(null); setFileBase64(''); setDraftDocumentId(undefined) }} className="text-red-400 hover:text-red-200">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form Cari Email Kontak Baru */}
          {showSearchSection && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Pencarian Akun / Email</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Masukkan email pegawai..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-blue-800"
                />
                <button onClick={handleSearchUser} disabled={loadingSearch} className="bg-[#1e4273] text-white px-4 py-2.5 rounded-lg text-xs font-semibold">
                  {loadingSearch ? 'Mencari...' : 'Cari'}
                </button>
              </div>

              {foundUser && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{foundUser.name}</p>
                    <p className="text-[11px] text-slate-500">{foundUser.email}</p>
                  </div>
                  <button 
                    onClick={() => handleSaveToContacts(foundUser)}
                    className="bg-[#1e4273] text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Pengaturan Penandatangan */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6 flex flex-col justify-between min-h-[400px]">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Pengaturan Penandatangan</h3>

            {/* Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> + Tambah Penandatangan</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showDropdown && (
                <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-10">
                  <button
                    onClick={() => { setShowSearchSection(true); setShowDropdown(false) }}
                    className="w-full text-left p-2 hover:bg-blue-50 rounded-lg text-xs font-semibold text-blue-600"
                  >
                    + Tambah Kontak Baru
                  </button>
                </div>
              )}
            </div>

            {/* KONTAK TERSEDIA (Hasil Simpan) */}
            {savedContacts.length > 0 && (
              <div className="space-y-2 border-b pb-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kontak Tersedia</p>
                {savedContacts.map((contact) => {
                  const isSelected = selectedRecipients.some((r) => r.id === contact.id)
                  return (
                    <div key={contact.id} className="p-3 border rounded-xl flex items-center justify-between bg-slate-50">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{contact.name}</p>
                        <p className="text-[10px] text-slate-500">{contact.email}</p>
                      </div>
                      <button
                        onClick={() => toggleSelectRecipient(contact)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-[#1e4273] text-white'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : 'Pilih'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* DAFTAR PENANDATANGAN DOKUMEN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">
                  Daftar Penanda Tangan ({selectedRecipients.length})
                </p>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={sequential}
                    onChange={(event) => setSequential(event.target.checked)}
                    className="accent-blue-600"
                  />
                  Berurutan
                </label>
              </div>

              {selectedRecipients.length === 0 ? (
                <div className="p-4 bg-slate-50 border rounded-xl text-center text-xs text-slate-400">
                  Belum ada penandatangan terpilih
                </div>
              ) : (
                selectedRecipients.map((recipient, index) => (
                  <div key={recipient.id} className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{recipient.name}</p>
                        <p className="text-[10px] text-slate-500">{recipient.email}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleSelectRecipient(recipient)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <button onClick={() => { void clearUploadDraft(); router.push('/dashboard') }} className="w-1/2 py-2.5 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loadingSubmit || !file || selectedRecipients.length === 0}
              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold disabled:opacity-40"
            >
              {loadingSubmit ? 'Memproses...' : 'Lanjutkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}