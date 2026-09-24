import { requireAdmin } from '@/lib/requireAdmin'
import { prisma } from '@/lib/prisma'
import AdminLogsClient from '@/app/admin/AdminLogsClient'

export default async function AdminLogsPage() {
  await requireAdmin()

  const logs = await prisma.signatureLog.findMany({
    orderBy: { signedAt: 'desc' },
    select: {
      id: true,
      ipAddress: true,
      signedAt: true,
      document: {
        select: { id: true, title: true, status: true },
      },
      signer: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return (
    <main className="w-full max-w-6xl mx-auto py-8 px-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Administrator</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Audit Trail Log</h1>
        <p className="text-sm font-normal text-slate-500 mt-1">
          Riwayat seluruh aktivitas penandatanganan digital beserta informasi keamanan sistem.
        </p>
      </div>
      <AdminLogsClient
        initialLogs={logs.map(l => ({
          ...l,
          signedAt: l.signedAt.toISOString(),
        }))}
      />
    </main>
  )
}
