import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import SpecimensTabClient from '@/components/SpecimensTabClient'

export default async function SpecimensPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <main className="w-full max-w-6xl mx-auto py-8 px-6">
      <SpecimensTabClient />
    </main>
  )
}
