'use client'

import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface DeleteDraftButtonProps {
  documentId: string
}

export default function DeleteDraftButton({ documentId }: DeleteDraftButtonProps) {
  const router = useRouter()

  const handleDelete = async () => {
    const confirmed = window.confirm('Apakah yakin ingin menghapus draft ini?')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh() // Memperbarui data Server Component tanpa perlu reload halaman penuh
      } else {
        alert('Gagal menghapus draft.')
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
      alert('Terjadi kesalahan saat menghapus draft.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
      title="Hapus Draft"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}